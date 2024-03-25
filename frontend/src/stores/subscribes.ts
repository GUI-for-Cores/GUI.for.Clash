import { ref } from 'vue'
import { defineStore } from 'pinia'
import { stringify, parse } from 'yaml'

import { usePluginsStore, useProfilesStore } from '@/stores'
import { SubscribesFilePath } from '@/constant'
import { Readfile, Writefile, HttpGet } from '@/bridge'
import {
  deepClone,
  debounce,
  sampleID,
  isValidSubYAML,
  getUserAgent,
  restoreProfile
} from '@/utils'

export type SubscribeType = {
  id: string
  name: string
  useInternal: boolean
  upload: number
  download: number
  total: number
  expire: string
  updateTime: string
  type: 'Http' | 'File'
  url: string
  website: string
  path: string
  include: string
  exclude: string
  includeProtocol: string
  excludeProtocol: string
  proxyPrefix: string
  disabled: boolean
  proxies: { id: string; name: string; type: string }[]
  userAgent: string
  healthCheck: {
    enable: boolean
    url: string
    interval: number
  }
  // Not Config
  updating?: boolean
}

export const useSubscribesStore = defineStore('subscribes', () => {
  const subscribes = ref<SubscribeType[]>([])

  const setupSubscribes = async () => {
    const data = await Readfile(SubscribesFilePath)
    subscribes.value = parse(data)
  }

  const saveSubscribes = debounce(async () => {
    const s = deepClone(subscribes.value)
    for (let i = 0; i < s.length; i++) {
      delete s[i].updating
    }
    await Writefile(SubscribesFilePath, stringify(s))
  }, 500)

  const addSubscribe = async (s: SubscribeType) => {
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
      expire: '',
      updateTime: '',
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
      userAgent: '',
      healthCheck: {
        enable: true,
        url: 'https://www.gstatic.com/generate_204',
        interval: 300
      },
      proxies: []
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

  const editSubscribe = async (id: string, s: SubscribeType) => {
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

  const _doUpdateSub = async (s: SubscribeType) => {
    const pattern = /upload=(\d*); download=(\d*); total=(\d*); expire=(\d*)/
    let userInfo = 'upload=0; download=0; total=0; expire=0'
    let body = ''
    let proxies: Record<string, any>[] = []

    if (s.type === 'File') {
      body = await Readfile(s.url)
    }

    if (s.type === 'Http') {
      const { header: h, body: b } = await HttpGet(s.url, {
        'User-Agent': s.userAgent || getUserAgent()
      })
      h['Subscription-Userinfo'] && (userInfo = h['Subscription-Userinfo'])
      body = b
    }

    if (!isValidSubYAML(body)) {
      throw 'Not a valid subscription data'
    }

    const pluginStore = usePluginsStore()

    const config = parse(body)

    proxies = (config.proxies as Record<string, any>[]).filter((v) => {
      const flag1 = s.include ? new RegExp(s.include).test(v.name) : true
      const flag2 = s.exclude ? !new RegExp(s.exclude).test(v.name) : true
      const flag3 = s.includeProtocol ? new RegExp(s.includeProtocol).test(v.type) : true
      const flag4 = s.excludeProtocol ? !new RegExp(s.excludeProtocol).test(v.type) : true
      return flag1 && flag2 && flag3 && flag4
    })

    const NameIdMap: Record<string, string> = {}
    const IdNameMap: Record<string, string> = {}

    proxies.forEach((proxy: any) => {
      // Keep the original ID value of the proxy unchanged
      proxy.__id__ = s.proxies.find((v) => v.name === proxy.name)?.id || sampleID()
      NameIdMap[proxy.name] = proxy.__id__

      if (s.proxyPrefix) {
        proxy.name = proxy.name.startsWith(s.proxyPrefix) ? proxy.name : s.proxyPrefix + proxy.name
      }
    })

    proxies = await pluginStore.onSubscribeTrigger(proxies, s)

    proxies.forEach((proxy: any) => {
      IdNameMap[proxy.__id__] = proxy.name
    })

    const match = userInfo.match(pattern) || [0, 0, 0, 0, 0]

    const [, upload = 0, download = 0, total = 0, expire = 0] = match
    s.upload = Number(upload)
    s.download = Number(download)
    s.total = Number(total)
    s.expire = Number(expire) ? new Date(Number(expire) * 1000).toLocaleString() : ''
    s.updateTime = new Date().toLocaleString()
    s.proxies = proxies.map(({ name, type, __id__ }) => ({ id: __id__, name, type }))

    if (s.useInternal) {
      const profilesStore = useProfilesStore()
      const profile = profilesStore.getProfileById(s.id)
      const _profile = restoreProfile(config, s.id, NameIdMap, IdNameMap)
      if (profile) {
        profilesStore.editProfile(profile.id, _profile)
      } else {
        _profile.name = s.name
        profilesStore.addProfile(_profile)
      }
    }

    if (s.type === 'Http' || s.url !== s.path) {
      proxies.forEach((proxy) => delete proxy.__id__)
      await Writefile(s.path, stringify({ proxies }))
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
    for (let i = 0; i < subscribes.value.length; i++) {
      const s = subscribes.value[i]
      if (s.disabled) continue
      try {
        s.updating = true
        await _doUpdateSub(s)
        needSave = true
      } finally {
        s.updating = false
      }
    }
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
    importSubscribe
  }
})
