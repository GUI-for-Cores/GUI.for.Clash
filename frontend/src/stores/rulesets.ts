import { ref } from 'vue'
import { defineStore } from 'pinia'
import { stringify, parse } from 'yaml'

import { Readfile, Writefile, HttpGet } from '@/utils/bridge'
import { RulesetsFilePath, RulesetBehavior } from '@/constant'
import { deepClone, debounce, isValidPaylodYAML } from '@/utils'

export type RuleSetType = {
  id: string
  name: string
  updateTime: string
  disabled: boolean
  type: 'Http' | 'File'
  behavior: RulesetBehavior
  format: 'yaml'
  path: string
  url: string
  interval: number
  count: number
  // Not Config
  updating?: boolean
}

export const useRulesetsStore = defineStore('rulesets', () => {
  const rulesets = ref<RuleSetType[]>([])

  const setupRulesets = async () => {
    const data = await Readfile(RulesetsFilePath)
    rulesets.value = parse(data)
  }

  const saveRulesets = debounce(async () => {
    const r = deepClone(rulesets.value)
    for (let i = 0; i < r.length; i++) {
      delete r[i].updating
    }
    await Writefile(RulesetsFilePath, stringify(r))
  }, 500)

  const addRuleset = async (r: RuleSetType) => {
    rulesets.value.push(r)
    try {
      await saveRulesets()
    } catch (error) {
      rulesets.value.pop()
      throw error
    }
  }

  const deleteRuleset = async (id: string) => {
    const idx = rulesets.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = rulesets.value.splice(idx, 1)[0]
    try {
      await saveRulesets()
    } catch (error) {
      rulesets.value.splice(idx, 0, backup)
      throw error
    }
  }

  const editRuleset = async (id: string, r: RuleSetType) => {
    const idx = rulesets.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = rulesets.value.splice(idx, 1, r)[0]
    try {
      await saveRulesets()
    } catch (error) {
      rulesets.value.splice(idx, 1, backup)
      throw error
    }
  }

  const _doUpdateRuleset = async (r: RuleSetType) => {
    let body = ''
    let ruleset: any

    if (r.type === 'File') {
      body = await Readfile(r.path)
    }

    if (r.type === 'Http') {
      const { body: b } = await HttpGet(r.url)
      body = b
    }

    if (isValidPaylodYAML(body)) {
      const yaml = parse(body)
      ruleset = yaml
    } else {
      throw 'Not a valid ruleset data'
    }

    await Writefile(r.path, stringify(ruleset))

    r.count = ruleset.payload.length
    r.updateTime = new Date().toLocaleString()
  }

  const updateRuleset = async (id: string) => {
    const r = rulesets.value.find((v) => v.id === id)
    if (!r || r.disabled) return
    try {
      r.updating = true
      await _doUpdateRuleset(r)
      await saveRulesets()
    } catch (error) {
      console.error('updateRuleset: ', r.name, error)
      throw error
    } finally {
      r.updating = false
    }
  }

  const updateRulesets = async () => {
    let needSave = false
    for (let i = 0; i < rulesets.value.length; i++) {
      const r = rulesets.value[i]
      if (r.disabled) continue
      try {
        r.updating = true
        await _doUpdateRuleset(r)
        needSave = true
      } catch (error) {
        console.error('updateRulesets: ', r.name, error)
      } finally {
        r.updating = false
      }
    }
    if (needSave) saveRulesets()
  }

  const getRulesetById = (id: string) => rulesets.value.find((v) => v.id === id)

  return {
    rulesets,
    setupRulesets,
    saveRulesets,
    addRuleset,
    editRuleset,
    deleteRuleset,
    updateRuleset,
    updateRulesets,
    getRulesetById
  }
})
