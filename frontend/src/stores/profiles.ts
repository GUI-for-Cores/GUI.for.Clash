import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parse } from 'yaml'

import { ReadFile, WriteFile } from '@/bridge'
import { ProfilesFilePath } from '@/constant'
import { ProxyGroup, RulesetBehavior, RulesetFormat } from '@/enums/kernel'
import { debounce, ignoredError, stringifyNoFolding } from '@/utils'

export type ProfileType = {
  id: string
  name: string
  generalConfig: {
    mode: string
    ipv6: boolean
    'mixed-port': number
    'allow-lan': boolean
    'log-level': string
    'interface-name': string
  }
  advancedConfig: {
    port: number
    'socks-port': number
    secret: string
    'external-controller': string
    'external-ui': string
    'keep-alive-interval': number
    'find-process-mode': string
    'external-controller-tls': string
    'external-ui-name': string
    'external-ui-url': string
    'unified-delay': boolean
    'tcp-concurrent': boolean
    authentication: string[]
    'skip-auth-prefixes': string[]
    tls: {
      certificate: string
      'private-key': string
    }
    'global-client-fingerprint': string
    'geodata-mode': boolean
    'geo-auto-update': boolean
    'geo-update-interval': number
    'geodata-loader': string
    'geosite-matcher': string
    'geox-url': {
      geoip: string
      geosite: string
      mmdb: string
      asn: string
    }
    'global-ua': string
    profile: {
      'store-selected'?: boolean
      'store-fake-ip'?: boolean
    }
    'lan-allowed-ips': string[]
    'lan-disallowed-ips': string[]
  }
  tunConfig: {
    enable: boolean
    stack: string
    'auto-route': boolean
    'route-address': string[]
    'route-exclude-address': string[]
    'auto-detect-interface': boolean
    'dns-hijack': string[]
    device: string
    mtu: number
    'strict-route': boolean
    'endpoint-independent-nat': boolean
  }
  dnsConfig: {
    enable: boolean
    listen: string
    'use-hosts': boolean
    'use-system-hosts': boolean
    ipv6: boolean
    'default-nameserver': string[]
    nameserver: string[]
    'enhanced-mode': string
    'fake-ip-range': string
    'fake-ip-filter-mode': string
    'fake-ip-filter': string[]
    'prefer-h3': boolean
    fallback: string[]
    'proxy-server-nameserver': string[]
    'nameserver-policy': Record<string, any>
    'fallback-filter': {
      geoip: boolean
      'geoip-code': string
      geosite: string[]
      ipcidr: string[]
      domain: string[]
    }
    hosts: Record<string, string>
  }
  proxyGroupsConfig: {
    id: string
    name: string
    type: ProxyGroup
    proxies: {
      id: string
      type: string
      name: string
    }[]
    url: string
    interval: number
    strategy: string
    use: string[]
    tolerance: number
    lazy: boolean
    'disable-udp': boolean
    filter: string
    'exclude-filter': string
    hidden: boolean
    icon: string
  }[]
  rulesConfig: {
    id: string
    type: string
    payload: string
    proxy: string
    'no-resolve': boolean
    'ruleset-type': 'file' | 'http' | 'inline'
    'ruleset-name': string
    'ruleset-behavior': RulesetBehavior
    'ruleset-format': RulesetFormat
    'ruleset-proxy': string
  }[]
  mixinConfig: {
    priority: 'mixin' | 'gui'
    format: 'json' | 'yaml'
    config: string
  }
  scriptConfig: {
    code: string
  }
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<ProfileType[]>([])

  const setupProfiles = async () => {
    const data = await ignoredError(ReadFile, ProfilesFilePath)
    data && (profiles.value = parse(data))
    // compatibility code
    profiles.value.forEach((profile) => {
      if (!profile.mixinConfig.format) {
        profile.mixinConfig.format = 'json'
      }
      if (profile.tunConfig['route-exclude-address'] === undefined) {
        profile.tunConfig['route-exclude-address'] = []
      }
      profile.rulesConfig.forEach((rule) => {
        if (!rule['ruleset-type']) {
          rule['ruleset-type'] = 'file'
          rule['ruleset-name'] = ''
          rule['ruleset-behavior'] = RulesetBehavior.Domain
          rule['ruleset-format'] = RulesetFormat.Yaml
          rule['ruleset-proxy'] = ''
        }
      })
    })
  }

  const saveProfiles = debounce(async () => {
    await WriteFile(ProfilesFilePath, stringifyNoFolding(profiles.value))
  }, 100)

  const addProfile = async (p: ProfileType) => {
    profiles.value.push(p)
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.pop()
      throw error
    }
  }

  const deleteProfile = async (id: string) => {
    const idx = profiles.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = profiles.value.splice(idx, 1)[0]
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.splice(idx, 0, backup)
      throw error
    }
  }

  const editProfile = async (id: string, p: ProfileType) => {
    const idx = profiles.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = profiles.value.splice(idx, 1, p)[0]
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.splice(idx, 1, backup)
      throw error
    }
  }

  const getProfileById = (id: string) => profiles.value.find((v) => v.id === id)

  return {
    profiles,
    setupProfiles,
    saveProfiles,
    addProfile,
    editProfile,
    deleteProfile,
    getProfileById,
  }
})
