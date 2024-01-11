<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useMessage } from '@/hooks'
import { DraggableOptions } from '@/constant'
import { deepClone, ignoredError } from '@/utils'
import { Readfile, Writefile } from '@/utils/bridge'
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

const keywordsRegexp = computed(() => new RegExp(keywords.value))

const filteredList = computed(() => {
  return rulesetList.value.filter((v) => keywordsRegexp.value.test(v))
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
    await Writefile(ruleset.value.path, stringify({ payload: rulesetList.value }))
    message.info('common.success')
    handleSubmit()
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
  loading.value = false
}

const handleAdd = () => {
  const rule = ruleValue.value.trim()
  if (rule && !rulesetList.value.includes(rule)) {
    rulesetList.value.push(rule)
  }
  ruleValue.value = ''
}

const resetForm = () => {
  keywords.value = ''
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
      <span class="label">
        {{ t('common.keywords') }}
        :
      </span>
      <Input v-model="keywords" :border="false" :delay="500" />
      <Button @click="resetForm" class="ml-8">
        {{ t('common.reset') }}
      </Button>
      <Input v-model="ruleValue" :border="false" class="ml-8" />
      <Button @click="handleAdd" type="primary" class="ml-8">
        {{ t('common.add') }}
      </Button>
    </div>
    <div v-draggable="[rulesetList, DraggableOptions]" class="rules">
      <div
        v-for="rule in filteredList"
        :key="rule"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(rule) }))"
        class="rule"
      >
        {{ rule }}
      </div>
    </div>
    <div class="action">
      <Button @click="handleCancel" :disable="loading">
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
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  background-color: var(--modal-bg);
  backdrop-filter: blur(2px);
  .label {
    padding: 0 8px;
    font-size: 12px;
  }
}
.rules {
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;

  .rule {
    display: inline-block;
    width: calc(33.33% - 4px);
    margin: 2px;
    padding: 8px;
    word-break: break-all;
    font-size: 12px;
    background: var(--card-bg);
  }
}

.action {
  display: flex;
  margin-top: 8px;
  justify-content: flex-end;
}

.ml-8 {
  margin-left: 8px;
}
</style>
