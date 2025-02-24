<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

import { useMessage } from '@/hooks'
import { deepClone, sampleID, generateRule } from '@/utils'
import { RulesetBehavior, RulesetFormat } from '@/enums/kernel'
import { type ProfileType, useRulesetsStore, type RuleSetType } from '@/stores'
import {
  RulesTypeOptions,
  DraggableOptions,
  RulesetFormatOptions,
  RulesetBehaviorOptions,
} from '@/constant'

interface Props {
  proxyGroups: ProfileType['proxyGroupsConfig']
  profile: ProfileType
}

const props = defineProps<Props>()

const rules = defineModel<ProfileType['rulesConfig']>({ default: [] })

let updateRuleId = 0
const showModal = ref(false)

const fields = ref<ProfileType['rulesConfig'][number]>({
  id: sampleID(),
  type: 'RULE-SET',
  payload: '',
  proxy: '',
  'no-resolve': false,
  'ruleset-type': 'file',
  'ruleset-name': '',
  'ruleset-behavior': RulesetBehavior.Domain,
  'ruleset-format': RulesetFormat.Mrs,
  'ruleset-proxy': '',
})

const proxyOptions = computed(() => [
  { label: 'DIRECT', value: 'DIRECT' },
  { label: 'REJECT', value: 'REJECT' },
  { label: 'PASS', value: 'PASS' },
  ...props.proxyGroups.map(({ id, name }) => ({ label: name, value: id })),
])

const supportNoResolve = computed(() =>
  ['GEOIP', 'IP-CIDR', 'IP-CIDR6', 'SCRIPT', 'RULE-SET', 'IP-ASN'].includes(fields.value.type),
)

const supportPayload = computed(
  () =>
    !['MATCH', 'RULE-SET'].includes(fields.value.type) ||
    (fields.value.type === 'RULE-SET' && fields.value['ruleset-type'] === 'http'),
)

const filteredRulesTypeOptions = computed(() =>
  RulesTypeOptions.filter(
    ({ value }) => props.profile.advancedConfig['geodata-mode'] || !value.startsWith('GEO'),
  ),
)

const { t } = useI18n()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()

const handleAdd = () => {
  updateRuleId = -1
  fields.value = {
    id: sampleID(),
    type: 'RULE-SET',
    payload: '',
    proxy: '',
    'no-resolve': false,
    'ruleset-type': 'file',
    'ruleset-name': '',
    'ruleset-behavior': RulesetBehavior.Domain,
    'ruleset-format': RulesetFormat.Mrs,
    'ruleset-proxy': '',
  }
  showModal.value = true
}

defineExpose({ handleAdd })

const handleDeleteRule = (index: number) => {
  rules.value.splice(index, 1)
}

const handleEditRule = (index: number) => {
  updateRuleId = index
  fields.value = deepClone(rules.value[index])
  showModal.value = true
}

const handleAddEnd = () => {
  if (updateRuleId !== -1) {
    rules.value[updateRuleId] = fields.value
  } else {
    rules.value.unshift(fields.value)
  }
}

const handleUseRuleset = (ruleset: RuleSetType) => {
  fields.value.payload = ruleset.id
  fields.value['no-resolve'] = ruleset.behavior === RulesetBehavior.Ipcidr
}

const hasLost = (r: ProfileType['rulesConfig'][0]) => {
  if (['DIRECT', 'REJECT', 'PASS'].includes(r.proxy)) return false
  return !props.profile.proxyGroupsConfig.find((v) => v.id === r.proxy)
}

const notSupport = (r: ProfileType['rulesConfig'][0]) => {
  return r.type.startsWith('GEO') && !props.profile.advancedConfig['geodata-mode']
}

const showNotSupport = () => message.warn('kernel.rules.needGeodataMode')

const showLost = () => message.warn('kernel.rules.notFound')
</script>

<template>
  <div v-draggable="[rules, DraggableOptions]">
    <Card v-for="(r, index) in rules" :key="r.id" class="rules-item">
      <div class="name">
        <span v-if="hasLost(r)" @click="showLost" class="warn"> [ ! ] </span>
        <span v-if="notSupport(r)" @click="showNotSupport" class="warn"> [ ! ] </span>
        {{ generateRule(r, profile.proxyGroupsConfig) }}
      </div>
      <div class="action">
        <Button @click="handleEditRule(index)" icon="edit" type="text" size="small" />
        <Button @click="handleDeleteRule(index)" icon="delete" type="text" size="small" />
      </div>
    </Card>
  </div>

  <Modal
    v-model:open="showModal"
    @ok="handleAddEnd"
    title="profile.rule"
    max-width="80"
    max-height="80"
  >
    <div class="form-item">
      {{ t('kernel.rules.type.name') }}
      <Select v-model="fields.type" :options="filteredRulesTypeOptions" />
    </div>
    <div v-show="supportPayload" class="form-item">
      {{ t('kernel.rules.payload') }}
      <CodeViewer
        v-if="fields.type === 'LOGIC'"
        v-model="fields.payload"
        editable
        lang="javascript"
        style="min-width: 200px"
      />
      <Input v-else v-model="fields.payload" autofocus />
    </div>
    <div class="form-item">
      {{ t('kernel.rules.proxy') }}
      <Select v-model="fields.proxy" :options="proxyOptions" />
    </div>
    <div v-if="fields.type === 'RULE-SET'" class="form-item">
      {{ t('kernel.rules.rule-set-type') }}
      <Select
        v-model="fields['ruleset-type']"
        :options="[
          { label: 'common.file', value: 'file' },
          { label: 'common.http', value: 'http' },
          { label: 'common.inline', value: 'inline' },
        ]"
      />
    </div>
    <div v-show="supportNoResolve" class="form-item">
      {{ t('kernel.rules.no-resolve') }}
      <Switch v-model="fields['no-resolve']" />
    </div>

    <template v-if="fields.type === 'RULE-SET' && fields['ruleset-type'] === 'file'">
      <Divider>{{ t('kernel.rules.rulesets') }}</Divider>
      <div class="rulesets">
        <Empty v-if="rulesetsStore.rulesets.length === 0" :description="t('kernel.rules.empty')" />
        <template v-else>
          <Card
            v-for="ruleset in rulesetsStore.rulesets"
            :key="ruleset.name"
            @click="handleUseRuleset(ruleset)"
            :selected="fields.payload === ruleset.id"
            :title="ruleset.name"
            v-tips="ruleset.path"
            class="ruleset"
          >
            {{ ruleset.path }}
          </Card>
        </template>
      </div>
    </template>

    <template v-if="fields.type === 'RULE-SET' && fields['ruleset-type'] === 'http'">
      <Divider>{{ t('kernel.rules.ruleset') }}</Divider>
      <div class="form-item">
        {{ t('kernel.rules.ruleset-name') }}
        <Input v-model="fields['ruleset-name']" />
      </div>
      <div class="form-item">
        {{ t('ruleset.behavior.name') }}
        <Select v-model="fields['ruleset-behavior']" :options="RulesetBehaviorOptions" />
      </div>
      <div class="form-item">
        {{ t('ruleset.format.name') }}
        <Select v-model="fields['ruleset-format']" :options="RulesetFormatOptions" />
      </div>
      <div class="form-item">
        {{ t('kernel.rules.ruleset-proxy') }}
        <Select v-model="fields['ruleset-proxy']" :options="proxyOptions" />
      </div>
    </template>

    <template v-if="fields.type === 'RULE-SET' && fields['ruleset-type'] === 'inline'">
      <Divider>{{ t('kernel.rules.ruleset') }}</Divider>
      <div class="form-item">
        {{ t('kernel.rules.ruleset-name') }}
        <Input v-model="fields['ruleset-name']" />
      </div>
      <div class="form-item">
        {{ t('ruleset.behavior.name') }}
        <Select v-model="fields['ruleset-behavior']" :options="RulesetBehaviorOptions" />
      </div>
      <CodeViewer v-model="fields['payload']" editable lang="yaml" />
    </template>
  </Modal>
</template>

<style lang="less" scoped>
.rules-item {
  display: flex;
  align-items: center;
  padding: 0 8px;
  margin-bottom: 2px;
  .name {
    font-weight: bold;
    .warn {
      color: rgb(200, 193, 11);
      cursor: pointer;
    }
  }
  .action {
    margin-left: auto;
  }
}

.rulesets {
  display: flex;
  flex-wrap: wrap;
  .ruleset {
    width: calc(33.3333% - 16px);
    margin: 8px;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
