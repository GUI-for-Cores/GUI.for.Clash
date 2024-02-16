<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBool } from '@/hooks'
import { useMessage } from '@/hooks'
import { deepClone, sampleID } from '@/utils'
import { type RuleSetType, useRulesetsStore } from '@/stores'
import { RulesetBehavior, RulesetFormatOptions, RulesetBehaviorOptions } from '@/constant'

interface Props {
  id?: string
  isUpdate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false
})

const loading = ref(false)

const ruleset = ref<RuleSetType>({
  id: sampleID(),
  name: '',
  updateTime: '',
  behavior: RulesetBehavior.Classical,
  type: 'Http',
  format: 'yaml',
  url: '',
  interval: 86400,
  count: 0,
  path: `data/rulesets/${sampleID()}.yaml`,
  disabled: false
})

const { t } = useI18n()
const { message } = useMessage()
const [showMore, toggleShowMore] = useBool(false)
const rulesetsStore = useRulesetsStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  loading.value = true

  if (props.isUpdate) {
    try {
      await rulesetsStore.editRuleset(props.id, ruleset.value)
      handleCancel()
    } catch (error: any) {
      console.error('editRuleset: ', error)
      message.error(error)
    }

    loading.value = true

    return
  }

  try {
    await rulesetsStore.addRuleset(ruleset.value)
    handleCancel()
  } catch (error: any) {
    console.error('addRuleset: ', error)
    message.error(error)
  }

  loading.value = true
}

if (props.isUpdate) {
  const r = rulesetsStore.getRulesetById(props.id)
  if (r) {
    ruleset.value = deepClone(r)
  }
}
</script>

<template>
  <div class="form">
    <div class="form-item">
      <div class="name">
        {{ t('ruleset.rulesetType') }}
      </div>
      <Radio
        v-model="ruleset.type"
        :options="[
          { label: 'common.http', value: 'Http' },
          { label: 'common.file', value: 'File' }
        ]"
      />
    </div>
    <div class="form-item">
      <div class="name">
        {{ t('ruleset.behavior.name') }}
      </div>
      <Radio v-model="ruleset.behavior" :options="RulesetBehaviorOptions" />
    </div>
    <div class="form-item">
      <div class="name">{{ t('ruleset.name') }} *</div>
      <Input v-model="ruleset.name" auto-size autofocus class="input" />
    </div>
    <div v-show="ruleset.type === 'Http'" class="form-item">
      <div class="name">{{ t('ruleset.url') }} *</div>
      <Input
        v-model="ruleset.url"
        :placeholder="ruleset.type === 'Http' ? 'http(s)://' : 'data/local/{filename}.txt'"
        auto-size
        class="input"
      />
    </div>
    <div class="form-item">
      <div class="name">{{ t('ruleset.path') }} *</div>
      <Input
        v-model="ruleset.path"
        placeholder="data/rulesets/{filename}.yaml"
        auto-size
        class="input"
      />
    </div>
    <Divider>
      <Button @click="toggleShowMore" type="text" size="small">
        {{ t('common.more') }}
      </Button>
    </Divider>
    <div v-show="showMore">
      <div class="form-item">
        <div class="name">{{ t('ruleset.interval') }}</div>
        <Input
          v-model="ruleset.interval"
          placeholder="data/rulesets/{filename}.yaml"
          auto-size
          type="number"
        />
      </div>
      <div class="form-item">
        <div class="name">{{ t('ruleset.format') }}</div>
        <Radio v-model="ruleset.format" :options="RulesetFormatOptions" />
      </div>
    </div>
  </div>
  <div class="form-action">
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button
      @click="handleSubmit"
      :loading="loading"
      :disable="!ruleset.name || !ruleset.path || (ruleset.type === 'Http' && !ruleset.url)"
      type="primary"
    >
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.form {
  padding: 0 8px;
  overflow-y: auto;
  max-height: 58vh;
  .name {
    font-size: 14px;
    padding: 8px 0;
    white-space: nowrap;
  }
  .input {
    width: 78%;
  }
}
</style>
