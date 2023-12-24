<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useMessage } from '@/hooks'
import { deepClone, ignoredError } from '@/utils'
import { updateProvidersRules } from '@/api/kernel'
import { Readfile, Writefile } from '@/utils/bridge'
import { type RuleSetType, type Menu, useRulesetsStore, useAppSettingsStore } from '@/stores'

interface Props {
  id: string
}

const props = defineProps<Props>()

const loading = ref(false)
const keywords = ref('')
const rulesetType = ref('')
const ruleset = ref<RuleSetType>()

const rulesetList = ref<string[]>([])

const keywordsRegexp = computed(() => new RegExp(keywords.value))

const filteredProxyTypeOptions = computed(() => {
  return []
})

const filteredList = computed(() => {
  return rulesetList.value.filter((v) => {
    const hitName = keywordsRegexp.value.test(v)
    return hitName
  })
})

const menus: Menu[] = [
  {
    label: 'common.delete',
    handler: (record: string) => {
      if (!ruleset.value) return
      const idx = rulesetList.value.findIndex((v) => v === record)
      if (idx !== -1) {
        rulesetList.value.splice(idx, 1)
      }
    }
  }
]

const handleCancel = inject('cancel') as any

const { t } = useI18n()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()
const appSettings = useAppSettingsStore()

const handleSave = async () => {
  if (!ruleset.value) return
  loading.value = true
  try {
    await Writefile(ruleset.value.path, stringify({ payload: rulesetList.value }))
    await _updateProvidersRules(ruleset.value.name)
    message.info('common.success')
    handleCancel()
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
  loading.value = false
}

const _updateProvidersRules = async (ruleset: string) => {
  if (appSettings.app.kernel.running) {
    await updateProvidersRules(ruleset)
  }
}

const resetForm = () => {
  keywords.value = ''
}

const initRulesetList = async (r: RuleSetType) => {
  const content = (await ignoredError(Readfile, r.path)) || '{}'
  const { payload = [] } = parse(content)
  rulesetList.value = payload
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
        {{ t('ruleset.rulesetType') }}
        :
      </span>
      <Select v-model="rulesetType" :options="filteredProxyTypeOptions" :border="false" />
      <span class="label">
        {{ t('common.keywords') }}
        :
      </span>
      <Input v-model="keywords" :border="false" :delay="500" />
      <Button @click="resetForm" type="primary" style="margin-left: 8px">
        {{ t('common.reset') }}
      </Button>
    </div>
    <div class="rules">
      <Card
        v-for="rule in filteredList"
        :key="rule"
        :title="rule"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(rule) }))"
        class="rule"
      >
      </Card>
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
    width: calc(25% - 4px);
    margin: 2px;
  }
}

.action {
  display: flex;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
