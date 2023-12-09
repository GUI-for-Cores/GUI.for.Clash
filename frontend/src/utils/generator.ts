import { parse, stringify } from 'yaml'
import { KernelConfigFilePath, ProxyGroup } from '@/constant/kernel'
import { type ProfileType, useSubscribesStore } from '@/stores'
import { Readfile, Writefile } from './bridge'
import { deepClone, ignoredError } from './index'
import { APP_TITLE } from './env'

export const generateRule = (rule: ProfileType['rulesConfig'][0]) => {
  const { type, payload, proxy, 'no-resolve': noResolve } = rule
  let ruleStr = type
  if (type !== 'MATCH') {
    ruleStr += ',' + payload
  }
  ruleStr += ',' + proxy
  if (noResolve) {
    ruleStr += ',no-resolve'
  }
  return ruleStr
}

type ProxiesType = { type: string; name: string }

export const generateProxies = async (groups: ProfileType['proxyGroupsConfig']) => {
  const subscribesStore = useSubscribesStore()

  const subNamesMap = new Set(
    groups.reduce(
      (p, c) => [
        ...p,
        ...c.proxies.filter(({ type }) => type !== 'Built-In').map(({ type }) => type)
      ],
      [] as string[]
    )
  )

  const proxyMap: Record<string, ProxiesType[]> = {}

  for (const subName of subNamesMap) {
    const sub = subscribesStore.getSubscribeByName(subName)
    if (sub) {
      try {
        const subStr = await Readfile(sub.path)
        const { proxies = [] } = parse(subStr)
        proxyMap[sub.name] = proxies
      } catch (error) {
        console.log(error)
      }
    }
  }

  const proxies = groups.reduce((p, c) => [...p, ...c.proxies], [] as ProxiesType[])

  const proxiesList: any = []

  proxies.forEach(({ type, name }) => {
    if (proxyMap[type]) {
      const proxy = proxyMap[type].find((v) => v.name === name)
      if (proxy) {
        const isExist = proxiesList.find((v: any) => v.name === proxy.name)
        !isExist && proxiesList.push(proxy)
      }
    }
  })

  return proxiesList
}

export const generateProxyGroup = (proxyGruoup: ProfileType['proxyGroupsConfig'][0]) => {
  const {
    type,
    name,
    url,
    proxies,
    use,
    interval,
    strategy,
    tolerance,
    lazy,
    'disable-udp': disableUDP,
    filter
  } = proxyGruoup

  const group: any = { name, type, filter }

  if (use.length !== 0) {
    group.use = use
  }

  if (proxies.length !== 0) {
    group.proxies = proxies.map((v) => v.name)
  }

  if (type === ProxyGroup.Select) {
    Object.assign(group, {
      'disable-udp': disableUDP
    })
  } else if (type === ProxyGroup.UrlTest) {
    Object.assign(group, {
      url,
      interval,
      tolerance,
      lazy,
      'disable-udp': disableUDP
    })
  } else if (type === ProxyGroup.Fallback) {
    Object.assign(group, {
      url,
      interval,
      lazy,
      'disable-udp': disableUDP
    })
  } else if (type === ProxyGroup.LoadBalance) {
    Object.assign(group, {
      url,
      interval,
      lazy,
      'disable-udp': disableUDP,
      strategy
    })
  } else if (type === ProxyGroup.Relay) {
    Object.assign(group, {})
  }

  return group
}

export const generateProxyProviders = async (groups: ProfileType['proxyGroupsConfig']) => {
  const providers: Record<string, any> = {}
  const subs = new Set<string>()
  groups.forEach((group) => {
    group.use.forEach((use) => subs.add(use))
  })
  const subscribesStore = useSubscribesStore()
  subs.forEach((name) => {
    const sub = subscribesStore.getSubscribeByName(name)
    if (sub) {
      providers[name] = {
        type: 'file',
        path: sub.path.replace('data/', '../'),
        'health-check': {
          enable: true,
          lazy: true,
          url: 'https://www.gstatic.com/generate_204',
          interval: 300
        }
      }
    }
  })

  return providers
}

const generateRuleProviders = async (rules: ProfileType['rulesConfig']) => {
  const providers: Record<string, any> = {}
  rules
    .filter((rule) => rule.type === 'RULE-SET')
    .forEach((rule) => {
      providers[rule.payload] = {
        type: 'file',
        behavior: 'classical',
        path: rule.path.replace('data/', '../')
      }
    })
  return providers
}

export const generateConfigFile = async (profile: ProfileType) => {
  profile = deepClone(profile)

  const config: Record<string, any> = {
    ...profile.generalConfig,
    ...profile.advancedConfig,
    tun: profile.tunConfig,
    dns: profile.dnsConfig
  }

  if (config.dns['default-nameserver'].length === 0) {
    delete config.dns['default-nameserver']
  }

  if (config.dns['nameserver'].length === 0) {
    delete config.dns['nameserver']
  }

  config['proxy-providers'] = await generateProxyProviders(profile.proxyGroupsConfig)

  config['rule-providers'] = await generateRuleProviders(profile.rulesConfig)

  config['proxies'] = await generateProxies(profile.proxyGroupsConfig)

  config['proxy-groups'] = profile.proxyGroupsConfig.map((proxyGruoup) =>
    generateProxyGroup(proxyGruoup)
  )

  config['rules'] = profile.rulesConfig
    .filter(({ type }) => profile.advancedConfig['geodata-mode'] || !type.startsWith('GEO'))
    .map((rule) => generateRule(rule))

  const header = `# DO NOT EDIT - Generated by ${APP_TITLE}\n`

  await Writefile(KernelConfigFilePath, header + stringify(config))
}

export const addToRuleSet = async (ruleset: 'direct' | 'reject' | 'proxy', domain = '') => {
  if (!domain) throw 'Domain Not Found'
  const path = `data/rulesets/${ruleset}.yaml`
  const content = (await ignoredError(Readfile, path)) || '{ payload: [] }'
  const { payload } = parse(content)
  payload.unshift('DOMAIN,' + domain)
  await Writefile(path, stringify({ payload: [...new Set(payload)] }))
}
