import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parse } from 'yaml'

import { CopyFile, ReadFile, WriteFile, HttpGet, Download, FileExists } from '@/bridge'
import { RulesetsFilePath, EmptyRuleSet, RulesetHubFilePath } from '@/constant'
import { RulesetBehavior, RulesetFormat } from '@/enums/kernel'
import {
  debounce,
  isValidPaylodYAML,
  ignoredError,
  omitArray,
  stringifyNoFolding,
  asyncPool,
  eventBus,
} from '@/utils'

export interface RuleSet {
  id: string
  name: string
  updateTime: number
  disabled: boolean
  type: 'Http' | 'File' | 'Manual'
  behavior: RulesetBehavior
  format: RulesetFormat
  path: string
  url: string
  count: number
  // Not Config
  updating?: boolean
}

export interface RulesetHub {
  geosite: string
  geoip: string
  list: { name: string; type: 'geosite' | 'geoip'; description: string; count: number }[]
}

export const useRulesetsStore = defineStore('rulesets', () => {
  const rulesets = ref<RuleSet[]>([])
  const rulesetHub = ref<RulesetHub>({ geosite: '', geoip: '', list: [] })

  const setupRulesets = async () => {
    const data = await ignoredError(ReadFile, RulesetsFilePath)
    data && (rulesets.value = parse(data))

    const list = await ignoredError(ReadFile, RulesetHubFilePath)
    list && (rulesetHub.value = JSON.parse(list))
  }

  const saveRulesets = debounce(async () => {
    const r = omitArray(rulesets.value, ['updating'])
    await WriteFile(RulesetsFilePath, stringifyNoFolding(r))
  }, 500)

  const addRuleset = async (r: RuleSet) => {
    rulesets.value.push(r)
    try {
      await saveRulesets()
    } catch (error) {
      const idx = rulesets.value.indexOf(r)
      if (idx !== -1) {
        rulesets.value.splice(idx, 1)
      }
      throw error
    }
  }

  const deleteRuleset = async (id: string) => {
    const idx = rulesets.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = rulesets.value.splice(idx, 1)[0]!
    try {
      await saveRulesets()
    } catch (error) {
      rulesets.value.splice(idx, 0, backup)
      throw error
    }

    eventBus.emit('rulesetChange', { id })
  }

  const editRuleset = async (id: string, r: RuleSet) => {
    const idx = rulesets.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = rulesets.value.splice(idx, 1, r)[0]!
    try {
      await saveRulesets()
    } catch (error) {
      rulesets.value.splice(idx, 1, backup)
      throw error
    }

    eventBus.emit('rulesetChange', { id })
  }

  const _doUpdateRuleset = async (r: RuleSet) => {
    if (r.format === RulesetFormat.Yaml) {
      let body = ''
      let isExist = true

      if (r.type === 'File') {
        body = await ReadFile(r.url)
      } else if (r.type === 'Http') {
        const { body: b } = await HttpGet(r.url)
        body = b
      } else if (r.type === 'Manual') {
        body = await ReadFile(r.path).catch(() => '')
        if (!body) {
          body = stringifyNoFolding(EmptyRuleSet)
          isExist = false
        }
      }

      if (!isValidPaylodYAML(body)) {
        throw 'Not a valid ruleset data'
      }

      const { payload } = parse(body)
      const ruleset = { payload: [...new Set(payload)] }

      if (
        (['Http', 'File'].includes(r.type) && r.url !== r.path) ||
        (r.type === 'Manual' && !isExist)
      ) {
        await WriteFile(r.path, stringifyNoFolding(ruleset))
      }

      r.count = ruleset.payload.length
    }

    if (r.format === RulesetFormat.Mrs) {
      if (r.type === 'File' && r.url !== r.path) {
        await CopyFile(r.url, r.path)
      } else if (r.type === 'Http') {
        await Download(r.url, r.path)
      }
    }

    r.updateTime = Date.now()
  }

  const updateRuleset = async (id: string) => {
    const r = rulesets.value.find((v) => v.id === id)
    if (!r) throw id + ' Not Found'
    if (r.disabled) throw r.name + ' Disabled'
    try {
      r.updating = true
      await _doUpdateRuleset(r)
      await saveRulesets()
    } finally {
      r.updating = false
    }

    eventBus.emit('rulesetChange', { id })

    return `Ruleset [${r.name}] updated successfully.`
  }

  const updateRulesets = async () => {
    let needSave = false

    const update = async (r: RuleSet) => {
      try {
        r.updating = true
        await _doUpdateRuleset(r)
        needSave = true
      } finally {
        r.updating = false
      }
    }

    await asyncPool(
      5,
      rulesets.value.filter((v) => !v.disabled),
      update,
    )

    if (needSave) saveRulesets()

    eventBus.emit('rulesetsChange', undefined)
  }

  const rulesetHubLoading = ref(false)
  const updateRulesetHub = async () => {
    rulesetHubLoading.value = true
    try {
      const { body } = await HttpGet<string>(
        'https://github.com/GUI-for-Cores/Ruleset-Hub/releases/download/latest/meta-full.json',
      )
      rulesetHub.value = JSON.parse(body)
      await WriteFile(RulesetHubFilePath, body)
    } finally {
      rulesetHubLoading.value = false
    }
  }

  const getRulesetById = (id: string) => rulesets.value.find((v) => v.id === id)

  const getRulesetByName = (name: string) => rulesets.value.find((v) => v.name === name)

  return {
    rulesets,
    setupRulesets,
    saveRulesets,
    addRuleset,
    editRuleset,
    deleteRuleset,
    updateRuleset,
    updateRulesets,
    getRulesetById,
    getRulesetByName,

    rulesetHub,
    rulesetHubLoading,
    updateRulesetHub,
  }
})
