<script setup lang="ts">
import { ref, inject, watch, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'

import { RulesetFormatOptions, RulesetBehaviorOptions } from '@/constant'
import { RulesetBehavior, RulesetFormat } from '@/enums/kernel'
import { type RuleSetType, useRulesetsStore } from '@/stores'
import { deepClone, sampleID, message } from '@/utils'

import Button from '@/components/Button/index.vue'

interface Props {
  id?: string
  isUpdate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false,
})

const loading = ref(false)

const ruleset = ref<RuleSetType>({
  id: sampleID(),
  name: '',
  updateTime: 0,
  behavior: RulesetBehavior.Classical,
  type: 'Http',
  format: RulesetFormat.Yaml,
  url: '',
  count: 0,
  path: `data/rulesets/${sampleID()}.yaml`,
  disabled: false,
})

const { t } = useI18n()
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

const disabled = computed(
  () =>
    !ruleset.value.name ||
    (ruleset.value.type === 'Manual' && !ruleset.value.path) ||
    (['Http', 'File'].includes(ruleset.value.type) && (!ruleset.value.url || !ruleset.value.path)),
)

watch(
  () => ruleset.value.type,
  (v) => {
    if (v === 'Manual') {
      ruleset.value.format = RulesetFormat.Yaml
    }
  },
)

watch(
  () => ruleset.value.format,
  (v) => {
    const isYaml = v === RulesetFormat.Yaml
    if (!isYaml && ruleset.value.behavior === RulesetBehavior.Classical) {
      ruleset.value.behavior = RulesetBehavior.Domain
    }
    ruleset.value.path = ruleset.value.path.replace(
      isYaml ? '.mrs' : '.yaml',
      isYaml ? '.yaml' : '.mrs',
    )
  },
)

watch(
  () => ruleset.value.behavior,
  (v, old) => {
    const isMrs = ruleset.value.format === RulesetFormat.Mrs
    if (isMrs) {
      if (v === RulesetBehavior.Classical && ruleset.value.type !== 'Manual') {
        ruleset.value.behavior = old
        message.error('Not support')
      }
    }
  },
)

if (props.isUpdate) {
  const r = rulesetsStore.getRulesetById(props.id)
  if (r) {
    ruleset.value = deepClone(r)
  }
}

const modalSlots = {
  cancel: () =>
    h(
      Button,
      {
        disabled: loading.value,
        onClick: handleCancel,
      },
      () => t('common.cancel'),
    ),
  submit: () =>
    h(
      Button,
      {
        type: 'primary',
        disabled: disabled.value,
        loading: loading.value,
        onClick: handleSubmit,
      },
      () => t('common.save'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <div>
    <div class="form-item">
      {{ t('ruleset.rulesetType') }}
      <Radio
        v-model="ruleset.type"
        :options="[
          { label: 'common.http', value: 'Http' },
          { label: 'common.file', value: 'File' },
          { label: 'ruleset.manual', value: 'Manual' },
        ]"
      />
    </div>
    <div class="form-item">
      {{ t('ruleset.behavior.name') }}
      <Radio v-model="ruleset.behavior" :options="RulesetBehaviorOptions" />
    </div>
    <div v-show="ruleset.type !== 'Manual'" class="form-item">
      {{ t('ruleset.format.name') }}
      <Radio v-model="ruleset.format" :options="RulesetFormatOptions" />
    </div>
    <div class="form-item">
      {{ t('ruleset.name') }} *
      <Input v-model="ruleset.name" autofocus class="min-w-[75%]" />
    </div>
    <div v-show="ruleset.type !== 'Manual'" class="form-item">
      {{ t('ruleset.url') }} *
      <Input
        v-model="ruleset.url"
        :placeholder="
          ruleset.type === 'Http'
            ? 'http(s)://'
            : 'data/local/{filename}.' + (ruleset.format === RulesetFormat.Mrs ? 'mrs' : 'yaml')
        "
        class="min-w-[75%]"
      />
    </div>
    <div class="form-item">
      {{ t('ruleset.path') }} *
      <Input
        v-model="ruleset.path"
        :placeholder="`data/rulesets/{filename}.${ruleset.format === RulesetFormat.Mrs ? 'mrs' : 'yaml'}`"
        class="min-w-[75%]"
      />
    </div>
  </div>
</template>
