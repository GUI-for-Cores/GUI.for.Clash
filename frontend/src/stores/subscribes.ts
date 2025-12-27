import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parse } from 'yaml'

import { ReadFile, WriteFile, Requests } from '@/bridge'
import { DefaultSubscribeScript, SubscribesFilePath } from '@/constant/app'
import { PluginTriggerEvent, RequestMethod } from '@/enums/app'
import { usePluginsStore, useProfilesStore } from '@/stores'
import {
  sampleID,
  isValidSubYAML,
  restoreProfile,
  ignoredError,
  omitArray,
  isValidBase64,
  stringifyNoFolding,
  asyncPool,
  eventBus,
  buildSmartRegExp,
} from '@/utils'

import type { Subscription } from '@/types/app'

export const useSubscribesStore = defineStore('subscribes', () => {
  const subscribes = ref<Subscription[]>([])

  const setupSubscribes = async () => {
    const data = await ignoredError(ReadFile, SubscribesFilePath)
    data && (subscribes.value = parse(data))
  }

  const saveSubscribes = () => {
    const s = omitArray(subscribes.value, ['updating'])
    return WriteFile(SubscribesFilePath, stringifyNoFolding(s))
  }

  const addSubscribe = async (s: Subscription) => {
    subscribes.value.push(s)
    try {
      await saveSubscribes()
    } catch (error) {
      const idx = subscribes.value.indexOf(s)
      if (idx !== -1) {
        subscribes.value.splice(idx, 1)
      }
      throw error
    }
  }

  const importSubscribe = async (name: string, url: string) => {
    await addSubscribe(getSubscribeTemplate(name, { url }))
  }

  const deleteSubscribe = async (id: string) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1)[0]!
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 0, backup)
      throw error
    }

    eventBus.emit('subscriptionChange', { id })
  }

  const editSubscribe = async (id: string, s: Subscription) => {
    const idx = subscribes.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = subscribes.value.splice(idx, 1, s)[0]!
    try {
      await saveSubscribes()
    } catch (error) {
      subscribes.value.splice(idx, 1, backup)
      throw error
    }

    eventBus.emit('subscriptionChange', { id })
  }

  const _doUpdateSub = async (s: Subscription) => {
    const userInfo: Recordable = {}
    let body = ''
    let proxies: Record<string, any>[] = []

    if (s.type === 'Manual') {
      body = await ReadFile(s.path)
    }

    if (s.type === 'File') {
      body = await ReadFile(s.url)
    }

    if (s.type === 'Http') {
      const { headers: h, body: b } = await Requests({
        method: s.requestMethod,
        url: s.url,
        headers: s.header.request,
        autoTransformBody: false,
        options: {
          Insecure: s.inSecure,
          Timeout: s.requestTimeout,
        },
      })
      Object.assign(h, s.header.response)
      if (h['Subscription-Userinfo']) {
        ;(h['Subscription-Userinfo'] as string).split(/\s*;\s*/).forEach((part) => {
          const [key, value] = part.split('=') as [string, string]
          userInfo[key] = parseInt(value) || 0
        })
      }
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
      const r1 = s.include && buildSmartRegExp(s.include)
      const r2 = s.exclude && buildSmartRegExp(s.exclude)
      const r3 = s.includeProtocol && buildSmartRegExp(s.includeProtocol)
      const r4 = s.excludeProtocol && buildSmartRegExp(s.excludeProtocol)

      proxies = proxies.filter((v) => {
        const flag1 = r1 ? r1.test(v.name) : true
        const flag2 = r2 ? r2.test(v.name) : false
        const flag3 = r3 ? r3.test(v.type) : true
        const flag4 = r4 ? r4.test(v.type) : false
        return flag1 && !flag2 && flag3 && !flag4
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

    s.upload = userInfo.upload ?? 0
    s.download = userInfo.download ?? 0
    s.total = userInfo.total ?? 0
    s.expire = userInfo.expire * 1000
    s.updateTime = Date.now()
    s.proxies = proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    const fn = new window.AsyncFunction(
      'proxies',
      'subscription',
      `${s.script}; return await ${PluginTriggerEvent.OnSubscribe}(proxies, subscription)`,
    ) as (
      proxies: Recordable[],
      subscription: Subscription,
    ) => Promise<{ proxies: Recordable[]; subscription: Subscription }>

    const { proxies: _proxies, subscription } = await fn(proxies, s)

    Object.assign(s, subscription)
    s.proxies = _proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    if (s.type === 'Http' || (s.type === 'File' && s.url !== s.path)) {
      proxies = omitArray(_proxies, ['__id__', '__tmp__id__'])
      await WriteFile(s.path, stringifyNoFolding({ proxies }))
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
    } catch (error: any) {
      throw `Failed to update subscription [${s.name}]. Reason: ${error.message || error}`
    } finally {
      s.updating = false
    }

    eventBus.emit('subscriptionChange', { id })

    return `Subscription [${s.name}] updated successfully.`
  }

  const updateSubscribes = async () => {
    let needSave = false

    const update = async (s: Subscription) => {
      const result = { ok: true, id: s.id, name: s.name, result: '' }
      try {
        s.updating = true
        await _doUpdateSub(s)
        needSave = true
        result.result = `Subscription [${s.name}] updated successfully.`
      } catch (error: any) {
        result.ok = false
        result.result = `Failed to update subscription [${s.name}]. Reason: ${error.message || error}`
      } finally {
        s.updating = false
      }
      return result
    }

    const result = await asyncPool(
      5,
      subscribes.value.filter((v) => !v.disabled),
      update,
    )

    if (needSave) await saveSubscribes()

    eventBus.emit('subscriptionsChange', undefined)

    return result.flatMap((v) => (v.ok && v.value) || [])
  }

  const getSubscribeById = (id: string) => subscribes.value.find((v) => v.id === id)

  const getSubscribeTemplate = (name = '', options: { url?: string } = {}): Subscription => {
    const id = sampleID()
    return {
      id: id,
      name: name,
      useInternal: false,
      upload: 0,
      download: 0,
      total: 0,
      expire: 0,
      updateTime: 0,
      type: 'Http',
      url: options.url || '',
      website: '',
      path: `data/subscribes/${id}.yaml`,
      include: '',
      exclude: '',
      includeProtocol: '',
      excludeProtocol: '',
      proxyPrefix: '',
      disabled: false,
      inSecure: false,
      requestMethod: RequestMethod.Get,
      requestTimeout: 15,
      header: {
        request: {},
        response: {},
      },
      script: DefaultSubscribeScript,
      proxies: [],
    }
  }

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
    getSubscribeTemplate,
  }
})
