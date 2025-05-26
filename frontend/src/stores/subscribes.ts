import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parse } from 'yaml'

import { Readfile, Writefile, HttpGet } from '@/bridge'
import { DefaultSubscribeScript, SubscribesFilePath } from '@/constant'
import { PluginTriggerEvent } from '@/enums/app'
import { usePluginsStore, useProfilesStore } from '@/stores'
import {
  debounce,
  sampleID,
  isValidSubYAML,
  getUserAgent,
  restoreProfile,
  ignoredError,
  omitArray,
  isValidBase64,
  stringifyNoFolding,
  asyncPool,
} from '@/utils'

import type { Subscription } from '@/types/app'

export const useSubscribesStore = defineStore('subscribes', () => {
  const subscribes = ref<Subscription[]>([])

  const setupSubscribes = async () => {
    const data = await ignoredError(Readfile, SubscribesFilePath)
    data && (subscribes.value = parse(data))

    let needSync = false
    subscribes.value.forEach((sub) => {
      if (!sub.script) {
        sub.script = DefaultSubscribeScript
        needSync = true
      }
    })

    if (needSync) {
      await saveSubscribes()
    }
  }

  const saveSubscribes = debounce(async () => {
    const s = omitArray(subscribes.value, ['updating'])
    await Writefile(SubscribesFilePath, stringifyNoFolding(s))
  }, 500)

  const addSubscribe = async (s: Subscription) => {
    subscribes.value.push(s)
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.pop()
      throw error
    }
  }

  const importSubscribe = async (name: string, url: string) => {
    const id = sampleID()
    await addSubscribe({
      id: id,
      name: name,
      useInternal: false,
      upload: 0,
      download: 0,
      total: 0,
      expire: 0,
      updateTime: 0,
      type: 'Http',
      url: url,
      website: '',
      path: `data/subscribes/${id}.yaml`,
      include: '',
      exclude: '',
      includeProtocol: '',
      excludeProtocol: '',
      proxyPrefix: '',
      disabled: false,
      inSecure: false,
      userAgent: '',
      script: DefaultSubscribeScript,
      healthCheck: {
        enable: false,
        url: 'https://www.gstatic.com/generate_204',
        interval: 300,
      },
      proxies: [],
    })
  }

  const deleteSubscribe = async (id: string) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1)[0]
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 0, backup)
      throw error
    }
  }

  const editSubscribe = async (id: string, s: Subscription) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1, s)[0]
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 1, backup)
      throw error
    }
  }

  const _doUpdateSub = async (s: Subscription) => {
    const pattern =
      /upload=(-?)([E+.\d]+);\s*download=(-?)([E+.\d]+);\s*total=([E+.\d]+);\s*expire=(\d*)/
    let userInfo = 'upload=0; download=0; total=0; expire=0'
    let body = ''
    let proxies: Record<string, any>[] = []

    if (s.type === 'Manual') {
      body = await Readfile(s.path)
    }

    if (s.type === 'File') {
      body = await Readfile(s.url)
    }

    if (s.type === 'Http') {
      const { headers: h, body: b } = await HttpGet(
        s.url,
        {
          'User-Agent': s.userAgent || getUserAgent(),
        },
        { Insecure: s.inSecure },
      )
      h['Subscription-Userinfo'] && (userInfo = h['Subscription-Userinfo'])
      body = b
    }

    let config: Record<string, any> | undefined
    let haveRules = false

    const NameIdMap: Record<string, string> = {}
    const IdNameMap: Record<string, string> = {}

    if (isValidSubYAML(body)) {
      config = parse(body) as Record<string, any>
      proxies = config.proxies
      haveRules = !!config.rules
      if (haveRules) {
        proxies.forEach((proxy, index) => {
          proxy.__tmp__id__ = index
          NameIdMap[proxy.name] = proxy.__tmp__id__
        })
      }
    } else if (isValidBase64(body)) {
      proxies = [{ base64: body }]
    } else {
      throw 'Not a valid subscription data'
    }

    const pluginStore = usePluginsStore()
    proxies = await pluginStore.onSubscribeTrigger(proxies, s)

    if (proxies.some((proxy) => proxy.base64)) {
      throw 'You need to install the [节点转换] plugin first'
    }

    if (s.type !== 'Manual') {
      proxies = proxies.filter((v) => {
        const flag1 = s.include ? new RegExp(s.include, 'i').test(v.name) : true
        const flag2 = s.exclude ? !new RegExp(s.exclude, 'i').test(v.name) : true
        const flag3 = s.includeProtocol ? new RegExp(s.includeProtocol, 'i').test(v.type) : true
        const flag4 = s.excludeProtocol ? !new RegExp(s.excludeProtocol, 'i').test(v.type) : true
        return flag1 && flag2 && flag3 && flag4
      })

      if (s.proxyPrefix) {
        proxies.forEach((v) => {
          v.name = v.name.startsWith(s.proxyPrefix) ? v.name : s.proxyPrefix + v.name
        })
      }
    }

    proxies.forEach((proxy: any) => {
      // Keep the original ID value of the proxy unchanged
      proxy.__id__ = s.proxies.find((v) => v.name === proxy.name)?.id || sampleID()
    })

    if (s.useInternal && s.type !== 'Manual' && haveRules) {
      proxies.forEach((proxy: any) => {
        IdNameMap[proxy.__tmp__id__] = proxy.name
      })
      const profilesStore = useProfilesStore()
      const profile = profilesStore.getProfileById(s.id)
      const _profile = restoreProfile(config!, s.id, NameIdMap, IdNameMap)
      if (profile) {
        _profile.name = profile.name
        _profile.advancedConfig.secret = profile.advancedConfig.secret
        _profile.mixinConfig = profile.mixinConfig
        _profile.scriptConfig = profile.scriptConfig
        profilesStore.editProfile(profile.id, _profile)
      } else {
        _profile.name = s.name
        profilesStore.addProfile(_profile)
      }
    }

    const match = userInfo.match(pattern) || [0, 0, 0, 0, 0]

    const [, , upload = 0, , download = 0, total = 0, expire = 0] = match
    s.upload = Number(upload)
    s.download = Number(download)
    s.total = Number(total)
    s.expire = Number(expire) * 1000
    s.updateTime = Date.now()
    s.proxies = proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    const fn = new window.AsyncFunction(
      `${s.script};return await ${PluginTriggerEvent.OnSubscribe}(${JSON.stringify(proxies)}, ${JSON.stringify(s)})`,
    ) as () => Promise<{ proxies: Recordable<any>[]; subscription: Subscription }>

    const { proxies: _proxies, subscription } = await fn()

    Object.assign(s, subscription)
    s.proxies = _proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    if (s.type === 'Http' || (s.type === 'File' && s.url !== s.path)) {
      proxies = omitArray(proxies, ['__id__', '__tmp__id__'])
      await Writefile(s.path, stringifyNoFolding({ proxies }))
    }
  }

  const updateSubscribe = async (id: string) => {
    const s = subscribes.value.find((v) => v.id === id)
    if (!s) throw id + ' Not Found'
    if (s.disabled) throw s.name + ' Disabled'
    try {
      s.updating = true
      await _doUpdateSub(s)
      await saveSubscribes()
      return `Subscription [${s.name}] updated successfully.`
    } finally {
      s.updating = false
    }
  }

  const updateSubscribes = async () => {
    let needSave = false

    const update = async (s: Subscription) => {
      try {
        s.updating = true
        await _doUpdateSub(s)
        needSave = true
      } finally {
        s.updating = false
      }
    }

    await asyncPool(
      5,
      subscribes.value.filter((v) => !v.disabled),
      update,
    )

    if (needSave) saveSubscribes()
  }

  const getSubscribeById = (id: string) => subscribes.value.find((v) => v.id === id)

  return {
    subscribes,
    setupSubscribes,
    saveSubscribes,
    addSubscribe,
    editSubscribe,
    deleteSubscribe,
    updateSubscribe,
    updateSubscribes,
    getSubscribeById,
    importSubscribe,
  }
})
