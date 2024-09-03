<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useMessage } from '@/hooks'
import { Readfile, Writefile } from '@/bridge'
import { DraggableOptions, RulesetBehavior } from '@/constant'
import { deepClone, ignoredError, isValidIPCIDR, stringifyNoFolding } from '@/utils'
import { type RuleSetType, type Menu, useRulesetsStore } from '@/stores'

interface Props {
  id: string
}

const props = defineProps<Props>()

const loading = ref(false)
const keywords = ref('')
const ruleValue = ref('')
const ruleset = ref<RuleSetType>()

const rulesetList = ref<string[]>([])

const keywordsRegexp = computed(() => {
  try {
    return new RegExp(keywords.value, 'i')
  } catch (error: any) {
    return keywords.value
  }
})

const filteredList = computed(() => {
  return rulesetList.value.filter((v) => {
    if (typeof keywordsRegexp.value === 'string') {
      return v.toLowerCase().includes(keywordsRegexp.value.toLowerCase())
    }
    return keywordsRegexp.value.test(v)
  })
})

const placeholder = computed(() => {
  if (!ruleset.value) return ''
  return {
    [RulesetBehavior.Classical]: 'DOMAIN,domain.com|IP-CIDR,127.0.0.0/8',
    [RulesetBehavior.Domain]: '.blogger.com|*.*.microsoft.com|books.itunes.apple.com',
    [RulesetBehavior.Ipcidr]: '192.168.1.0/24|10.0.0.1/32'
  }[ruleset.value.behavior]
})

const menus: Menu[] = [
  {
    label: 'common.delete',
    handler: (record: string) => {
      const idx = rulesetList.value.findIndex((v) => v === record)
      if (idx !== -1) {
        rulesetList.value.splice(idx, 1)
      }
    }
  }
]

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any

const { t } = useI18n()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()

const handleSave = async () => {
  if (!ruleset.value) return
  loading.value = true
  try {
    await Writefile(ruleset.value.path, stringifyNoFolding({ payload: rulesetList.value }))
    handleSubmit()
  } catch (error: any) {
    message.error(error)
    console.log(error)
  }
  loading.value = false
}

const handleAdd = () => {
  const rule = ruleValue.value.trim()
  if (!rule || rulesetList.value.includes(rule)) {
    ruleValue.value = ''
    return
  }
  const rules = [
    ...new Set(rule.split('|').filter((rule) => rule && !rulesetList.value.includes(rule)))
  ]
  if (ruleset.value?.behavior === RulesetBehavior.Ipcidr) {
    if (rules.some((rule) => !isValidIPCIDR(rule))) {
      message.warn('Not a valid IP-CIDR format')
      return
    }
  }
  rulesetList.value.push(...rules)
  ruleValue.value = ''
}

const initRulesetList = async (r: RuleSetType) => {
  const content = (await ignoredError(Readfile, r.path)) || '{}'
  const { payload = [] } = parse(content)
  rulesetList.value.push(...payload)
}

const r = rulesetsStore.getRulesetById(props.id)
if (r) {
  ruleset.value = deepClone(r)
  initRulesetList(r)
}
</script>

<template>
  <div class="ruleset-view">
    <div class="form">
      <Input v-model="keywords" clearable size="small" :placeholder="t('common.keywords')" />
      <Input
        v-model="ruleValue"
        :placeholder="placeholder"
        clearable
        auto-size
        size="small"
        class="ml-8 flex-1"
      />
      <Button @click="handleAdd" type="primary" size="small" class="ml-8">
        {{ t('common.add') }}
      </Button>
    </div>

    <Empty v-if="rulesetList.length === 0" class="flex-1" />

    <div v-else v-draggable="[rulesetList, DraggableOptions]" class="rules">
      <div
        v-for="rule in filteredList"
        :key="rule"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(rule) }))"
        class="rule"
      >
        {{ rule }}
      </div>
    </div>
    <div class="form-action">
      <Button @click="handleCancel" :disabled="loading">
        {{ t('common.cancel') }}
      </Button>
      <Button @click="handleSave" :loading="loading" type="primary">
        {{ t('common.save') }}
      </Button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.ruleset-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.form {
  display: flex;
  align-items: center;
}
.rules {
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  .rule {
    display: flex;
    align-items: center;
    width: calc(33.33% - 4px);
    margin: 2px;
    padding: 0 8px;
    line-height: 20px;
    height: 40px;
    word-break: break-all;
    font-size: 12px;
    background: var(--card-bg);
    overflow: hidden;
  }
}
</style>
