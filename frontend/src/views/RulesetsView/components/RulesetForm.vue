<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { type RuleSetType, useRulesetsStore, useProfilesStore } from '@/stores'
import { useMessage } from '@/hooks/useMessage'
import { useBool } from '@/hooks/useBool'
import { deepClone, sampleID } from '@/utils'
import { RulesetBehavior, RulesetFormatOptions } from '@/constant/kernel'

interface Props {
  id?: string
  isUpdate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false
})

let oldRulesetName = ''

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
const profilesStore = useProfilesStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  if (props.isUpdate) {
    try {
      await rulesetsStore.editRuleset(props.id, ruleset.value)
      updateProfilesReferences()
      handleCancel()
    } catch (error: any) {
      console.error('editRuleset: ', error)
      message.info(error)
    }
  } else {
    try {
      await rulesetsStore.addRuleset(ruleset.value)
      handleCancel()
    } catch (error: any) {
      console.error('addRuleset: ', error)
      message.info(error)
    }
  }
}

const updateProfilesReferences = () => {
  profilesStore.profiles.forEach((profile) => {
    const needUpdate = profile.proxyGroupsConfig.some((group) => group.use.includes(oldRulesetName))
    if (needUpdate) {
      profile.proxyGroupsConfig.forEach((group) => {
        group.use = group.use.map((v) => (v === oldRulesetName ? ruleset.value.name : v))
      })
      try {
        profilesStore.saveProfiles()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

if (props.isUpdate) {
  const r = rulesetsStore.getRulesetById(props.id)
  if (r) {
    oldRulesetName = r.name
    ruleset.value = deepClone(r)
  }
}
</script>

<template>
  <div class="form-item">
    <div class="name">
      {{ t('ruleset.rulesetType') }}
    </div>
    <Radio
      v-model="ruleset.type"
      :options="[
        { label: 'ruleset.http', value: 'Http' },
        { label: 'ruleset.file', value: 'File' }
      ]"
    />
  </div>
  <div class="form-item">
    <div class="name">
      {{ t('ruleset.behavior.name') }}
    </div>
    <Radio
      v-model="ruleset.behavior"
      :options="[
        { label: 'ruleset.behavior.classical', value: RulesetBehavior.Classical },
        { label: 'ruleset.behavior.domain', value: RulesetBehavior.Domain },
        { label: 'ruleset.behavior.ipcidr', value: RulesetBehavior.Ipcidr }
      ]"
    />
  </div>
  <div class="form-item">
    <div class="name">* {{ t('ruleset.name') }}</div>
    <Input v-model="ruleset.name" auto-size autofocus class="input" />
  </div>
  <div class="form-item">
    <div class="name">* {{ t('ruleset.url') }}</div>
    <Input
      v-model="ruleset.url"
      :placeholder="ruleset.type === 'Http' ? 'http(s)://' : 'data/local/{filename}.txt'"
      auto-size
      class="input"
    />
  </div>
  <div class="form-item">
    <div class="name">* {{ t('ruleset.path') }}</div>
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
  <div class="action">
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button
      @click="handleSubmit"
      :disable="!ruleset.name || !ruleset.url || !ruleset.path"
      type="primary"
    >
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.form-item {
  margin-bottom: 8px;
  .name {
    font-size: 14px;
    padding: 8px 0;
  }
  .input {
    width: 80%;
  }
}
.action {
  display: flex;
  justify-content: flex-end;
}
</style>
