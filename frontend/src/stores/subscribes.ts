import { ref } from 'vue'
import { defineStore } from 'pinia'
import { stringify, parse } from 'yaml'

import { useAppSettingsStore } from '@/stores'
import { Readfile, Writefile, HttpGet } from '@/utils/bridge'
import { SubscribesFilePath, NodeConverterFilePath } from '@/constant'
import { deepClone, debounce, isValidBase64, isValidSubYAML, sampleID } from '@/utils'

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
  disabled: boolean
  proxies: { id: string; name: string; type: string }[]
  userAgent: string
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
        'User-Agent': s.userAgent || appSettings.app.userAgent
      })
      if (h['Subscription-Userinfo'] && h['Subscription-Userinfo'][0]) {
        userInfo = h['Subscription-Userinfo'][0]
      }
      body = b
    }

    if (isValidBase64(body)) {
      let converterStr = ''
      try {
        converterStr = await Readfile(NodeConverterFilePath)
      } catch {
        throw NodeConverterFilePath + ' Not Found!'
      }
      const url = URL.createObjectURL(new Blob([converterStr]))
      const worker = new Worker(url)

      let resolve: (value: unknown) => void
      const promise = new Promise((r) => (resolve = r))

      const links = atob(body).trim().split('\n')
      links.forEach((link, index) => {
        worker.postMessage({ link, done: index === links.length - 1 })
      })

      worker.onmessage = ({ data: { node, done } }) => {
        if (node) {
          const flag1 = s.include ? new RegExp(s.include).test(node.name) : true
          const flag2 = s.exclude ? !new RegExp(s.exclude).test(node.name) : true

          if (flag1 && flag2) proxies.push(node)
        }

        if (done) {
          worker.terminate()
          URL.revokeObjectURL(url)
          resolve(null)
        }
      }

      await promise
    } else if (isValidSubYAML(body)) {
      const yaml = parse(body)
      proxies = yaml.proxies ?? []
      proxies = proxies.filter((v) => {
        const flag1 = s.include ? new RegExp(s.include).test(v.name) : true
        const flag2 = s.exclude ? !new RegExp(s.exclude).test(v.name) : true
        return flag1 && flag2
      })
    } else {
      throw 'Not a valid subscription data'
    }

    await Writefile(s.path, stringify({ proxies }))

    const match = userInfo.match(pattern) || [0, 0, 0, 0, 0]

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, upload = 0, download = 0, total = 0, expire = 0] = match
    s.upload = Number(upload)
    s.download = Number(download)
    s.total = Number(total)
    s.expire = expire !== '0' ? new Date(Number(expire) * 1000).toLocaleString() : ''
    s.updateTime = new Date().toLocaleString()
    s.proxies = proxies.map((v: any) => ({ id: sampleID(), name: v.name, type: v.type }))
  }

  const updateSubscribe = async (id: string) => {
    const s = subscribes.value.find((v) => v.id === id)
    if (!s) return
    if (s.disabled) return
    try {
      s.updating = true
      await _doUpdateSub(s)
      await saveSubscribes()
    } catch (error) {
      console.error('updateSubscribe: ', s.name, error)
      throw error
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
      } catch (error) {
        console.error('updateSubscribes: ', s.name, error)
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
    getSubscribeById
  }
})
