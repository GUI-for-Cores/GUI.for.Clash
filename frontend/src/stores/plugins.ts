import { ref } from 'vue'
import { defineStore } from 'pinia'
import { parse, stringify } from 'yaml'

import { useAppSettingsStore } from '@/stores'
import { debounce, deepClone, ignoredError, isValidSubYAML } from '@/utils'
import { PluginsFilePath, PluginTrigger, PluginManualEvent } from '@/constant'
import { HttpGet, Readfile, Writefile } from '@/utils/bridge'

export type PluginType = {
  id: string
  name: string
  description: string
  type: 'Http' | 'File'
  url: string
  path: string
  trigger: PluginTrigger
  disabled: boolean
  install: boolean
  installed: boolean
  // Not Config
  updating?: boolean
  loading?: boolean
}

const PluginsMap: {
  [key in PluginTrigger]: { fnName: string; observers: Record<string, string> }
} = {
  [PluginTrigger.OnManual]: {
    fnName: 'onRun',
    observers: {}
  },
  [PluginTrigger.OnSubscribe]: {
    fnName: 'onSubscribe',
    observers: {}
  },
  [PluginTrigger.OnGenerate]: {
    fnName: 'onGenerate',
    observers: {}
  },
  [PluginTrigger.OnStartup]: {
    fnName: 'onStartup',
    observers: {}
  },
  [PluginTrigger.OnUpdateRuleset]: {
    fnName: 'onUpdateRuleset',
    observers: {}
  }
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<PluginType[]>([])

  const setupPlugins = async () => {
    const data = await Readfile(PluginsFilePath)
    plugins.value = parse(data)

    for (let i = 0; i < plugins.value.length; i++) {
      const { id, trigger, path } = plugins.value[i]
      const code = await ignoredError(Readfile, path)
      code && (PluginsMap[trigger].observers[id] = code)
    }
  }

  const reloadPlugin = async (_id: string, code = '') => {
    const plugin = getPluginById(_id)
    if (plugin) {
      const { id, trigger, path } = plugin
      if (!code) {
        code = await Readfile(path)
      }
      PluginsMap[trigger].observers[id] = code
    }
  }

  const savePlugins = debounce(async () => {
    const p = deepClone(plugins.value)
    for (let i = 0; i < p.length; i++) {
      delete p[i].updating
      delete p[i].loading
    }
    await Writefile(PluginsFilePath, stringify(p))
  }, 100)

  const addPlugin = async (p: PluginType) => {
    plugins.value.push(p)
    try {
      await savePlugins()
    } catch (error) {
      plugins.value.pop()
      throw error
    }
  }

  const deletePlugin = async (id: string) => {
    const idx = plugins.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = plugins.value.splice(idx, 1)[0]
    const backupCode = PluginsMap[backup.trigger].observers[id]
    delete PluginsMap[backup.trigger].observers[id]
    try {
      await savePlugins()
    } catch (error) {
      plugins.value.splice(idx, 0, backup)
      PluginsMap[backup.trigger].observers[id] = backupCode
      throw error
    }
  }

  const editPlugin = async (id: string, p: PluginType) => {
    const idx = plugins.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = plugins.value.splice(idx, 1, p)[0]
    try {
      await savePlugins()
    } catch (error) {
      plugins.value.splice(idx, 1, backup)
      throw error
    }
  }

  const _doUpdatePlugin = async (p: PluginType) => {
    let body = ''

    if (p.type === 'File') {
      body = await Readfile(p.path)
    }

    if (p.type === 'Http') {
      const appSettings = useAppSettingsStore()
      const { body: b } = await HttpGet(p.url, {
        'User-Agent': appSettings.app.userAgent
      })
      body = b
    }

    await Writefile(p.path, body)

    PluginsMap[p.trigger].observers[p.id] = body
  }

  const updatePlugin = async (id: string) => {
    const p = plugins.value.find((v) => v.id === id)
    if (!p) return
    if (p.disabled) return
    try {
      p.updating = true
      await _doUpdatePlugin(p)
      await savePlugins()
    } catch (error) {
      console.error('updatePlugin: ', p.name, error)
      throw error
    } finally {
      p.updating = false
    }
  }

  const updatePlugins = async () => {
    let needSave = false
    for (let i = 0; i < plugins.value.length; i++) {
      const p = plugins.value[i]
      if (p.disabled) continue
      try {
        p.updating = true
        await _doUpdatePlugin(p)
        needSave = true
      } catch (error) {
        console.error('updatePlugins: ', p.name, error)
      } finally {
        p.updating = false
      }
    }
    if (needSave) savePlugins()
  }

  const getPluginById = (id: string) => plugins.value.find((v) => v.id === id)

  const onSubscribeTrigger = async (params: string) => {
    const { fnName, observers } = PluginsMap[PluginTrigger.OnSubscribe]
    const pluginIds = Object.keys(observers)
    const observersCode = Object.values(observers)

    let result = params

    if (isValidSubYAML(result)) {
      result = parse(result).proxies
    }

    for (let i = 0; i < observersCode.length; i++) {
      if (getPluginById(pluginIds[i])?.disabled) {
        console.log('skip')
        continue
      }
      if (typeof result !== 'string') {
        result = JSON.stringify(result)
      } else {
        result = `\`${result}\``
      }
      result = await eval(`${observersCode[i]};(async () => (await ${fnName}(${result})))()`)
    }

    if (typeof result === 'string') {
      result = parse(result)
    }

    return result as unknown as Record<string, any>[]
  }

  const onStartupTrigger = async () => {
    const { fnName, observers } = PluginsMap[PluginTrigger.OnStartup]
    const pluginIds = Object.keys(observers)
    const observersCode = Object.values(observers)

    if (observersCode.length === 0) return

    for (let i = 0; i < observersCode.length; i++) {
      if (getPluginById(pluginIds[i])?.disabled) {
        console.log('skip')
        continue
      }
      await eval(`${observersCode[i]};(async () => (await ${fnName}()))()`)
    }

    return
  }

  const onGenerateTrigger = async (params: Record<string, any>) => {
    const { fnName, observers } = PluginsMap[PluginTrigger.OnGenerate]
    const pluginIds = Object.keys(observers)
    const observersCode = Object.values(observers)
    if (observersCode.length === 0) return params

    for (let i = 0; i < observersCode.length; i++) {
      if (getPluginById(pluginIds[i])?.disabled) {
        console.log('skip')
        continue
      }

      params = await eval(
        `${observersCode[i]};(async () => (await ${fnName}(${JSON.stringify(params)})))()`
      )
    }

    return params as Record<string, any>
  }

  const pluginTrigger = async (plugin: PluginType, event: PluginManualEvent) => {
    const { observers } = PluginsMap[plugin.trigger]
    const result = await eval(`${observers[plugin.id]};(async () => (await ${event}()))()`)
    return result
  }

  return {
    plugins,
    setupPlugins,
    savePlugins,
    addPlugin,
    editPlugin,
    deletePlugin,
    updatePlugin,
    updatePlugins,
    getPluginById,
    reloadPlugin,
    onSubscribeTrigger,
    onGenerateTrigger,
    onStartupTrigger,
    pluginTrigger
  }
})
