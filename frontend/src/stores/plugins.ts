import { ref } from 'vue'
import { defineStore } from 'pinia'
import { parse, stringify } from 'yaml'

import { debounce } from '@/utils'
import { Readfile, Writefile } from '@/utils/bridge'
import { PluginsFilePath } from '@/constant'

enum Permission {
  ReadSubscription = 'read::subscription',
  WriteSubscription = 'write::subscription',
  HttpGet = 'http::get',
  HttpPost = 'http::post',
  HttpDownload = 'http::download',
  KernelApi = 'kernel::api',
  KernelLog = 'kernel:log',
  KernelTraffic = 'kernel:traffic',
  KernelMemory = 'kernel:memory',
  KernelConnection = 'kernel:connection'
}

export type PluginType = {
  id: string // plugin-[id], e.g. plugin-node-converter.js
  name: string // e.g Node-Converter
  description: string
  author: string
  url: string
  permission: Permission[]
  official: boolean
  releaseTime: string
  updateTime: string
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<PluginType[]>([])

  const setupPlugins = async () => {
    const data = await Readfile(PluginsFilePath)
    plugins.value = parse(data)
  }

  const saveplugins = debounce(async () => {
    await Writefile(PluginsFilePath, stringify(plugins.value))
  }, 100)

  const addPlugin = async (p: PluginType) => {
    plugins.value.push(p)
    try {
      await saveplugins()
    } catch (error) {
      plugins.value.pop()
      throw error
    }
  }

  const deletePlugin = async (id: string) => {
    const idx = plugins.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = plugins.value.splice(idx, 1)[0]
    try {
      await saveplugins()
    } catch (error) {
      plugins.value.splice(idx, 0, backup)
      throw error
    }
  }

  const editPlugin = async (id: string, p: PluginType) => {
    const idx = plugins.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = plugins.value.splice(idx, 1, p)[0]
    try {
      await saveplugins()
    } catch (error) {
      plugins.value.splice(idx, 1, backup)
      throw error
    }
  }

  const getPluginById = (id: string) => plugins.value.find((v) => v.id === id)

  return {
    plugins,
    setupPlugins,
    saveplugins,
    addPlugin,
    editPlugin,
    deletePlugin,
    getPluginById
  }
})
