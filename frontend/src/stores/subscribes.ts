import { ref } from 'vue'
import { defineStore } from 'pinia'
import { stringify, parse } from 'yaml'

import { SubscribesFilePath } from '@/constant'
import { Readfile, Writefile, HttpGet } from '@/bridge'
import { useAppSettingsStore, usePluginsStore } from '@/stores'
import { deepClone, debounce, sampleID, APP_TITLE, APP_VERSION, isValidSubYAML } from '@/utils'

export type SubscribeType = {
  id: string
  name: string
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
      const appSettings = useAppSettingsStore()

      const { header: h, body: b } = await HttpGet(s.url, {
        'User-Agent': s.userAgent || appSettings.app.userAgent || APP_TITLE + '/' + APP_VERSION
      })
      if (h['Subscription-Userinfo'] && h['Subscription-Userinfo'][0]) {
        userInfo = h['Subscription-Userinfo'][0]
      }
      body = b
    }

    if (!isValidSubYAML(body)) {
      throw 'Not a valid subscription data'
    }

    const pluginStore = usePluginsStore()

    proxies = await pluginStore.onSubscribeTrigger(parse(body).proxies, s)

    proxies = proxies.filter((v) => {
      const flag1 = s.include ? new RegExp(s.include).test(v.name) : true
      const flag2 = s.exclude ? !new RegExp(s.exclude).test(v.name) : true
      const flag3 = s.includeProtocol ? new RegExp(s.includeProtocol).test(v.type) : true
      const flag4 = s.excludeProtocol ? !new RegExp(s.excludeProtocol).test(v.type) : true
      return flag1 && flag2 && flag3 && flag4
    })

    if (s.proxyPrefix) {
      proxies = proxies.map((v) => ({
        ...v,
        name: v.name.startsWith(s.proxyPrefix) ? v.name : s.proxyPrefix + v.name
      }))
    }

    if (s.type === 'Http' || s.url !== s.path) {
      await Writefile(s.path, stringify({ proxies }))
    }

    const match = userInfo.match(pattern) || [0, 0, 0, 0, 0]

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, upload = 0, download = 0, total = 0, expire = 0] = match
    s.upload = Number(upload)
    s.download = Number(download)
    s.total = Number(total)
    s.expire = Number(expire) ? new Date(Number(expire) * 1000).toLocaleString() : ''
    s.updateTime = new Date().toLocaleString()
    s.proxies = proxies.map(({ name, type }) => {
      // Keep the original ID value of the proxy unchanged
      const id = s.proxies.find((v) => v.name === name)?.id || sampleID()
      return { id, name, type }
    })
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
