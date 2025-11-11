<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  RulesTypeOptions,
  DraggableOptions,
  RulesetFormatOptions,
  RulesetBehaviorOptions,
  BuiltInOutbound,
} from '@/constant'
import { RulesetBehavior, RulesetFormat, RuleType } from '@/enums/kernel'
import { type ProfileType, useRulesetsStore, type RuleSet } from '@/stores'
import { deepClone, sampleID, generateRule, message } from '@/utils'

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
  type: RuleType.RuleSet,
  payload: '',
  proxy: '',
  'no-resolve': false,
  'ruleset-type': 'file',
  'ruleset-name': '',
  'ruleset-behavior': RulesetBehavior.Domain,
  'ruleset-format': RulesetFormat.Mrs,
  'ruleset-proxy': '',
  'ruleset-interval': 0,
})

const proxyOptions = computed(() => [
  ...BuiltInOutbound.map((v) => ({ label: v, value: v })),
  ...props.proxyGroups.map(({ id, name }) => ({ label: name, value: id })),
])

const supportNoResolve = computed(() =>
  [
    RuleType.Geoip,
    RuleType.IpCidr,
    RuleType.IpCidr6,
    RuleType.SCRIPT,
    RuleType.RuleSet,
    RuleType.IpAsn,
  ].includes(fields.value.type),
)

const supportPayload = computed(
  () =>
    ![RuleType.Match, RuleType.RuleSet, RuleType.InsertionPoint].includes(fields.value.type) ||
    (fields.value.type === RuleType.RuleSet && fields.value['ruleset-type'] === 'http'),
)

const isInsertionPointMissing = computed(
  () => rules.value.findIndex((rule) => rule.type === RuleType.InsertionPoint) === -1,
)

const { t } = useI18n()
const rulesetsStore = useRulesetsStore()

const handleAdd = () => {
  updateRuleId = -1
  fields.value = {
    id: sampleID(),
    type: RuleType.RuleSet,
    payload: '',
    proxy: '',
    'no-resolve': false,
    'ruleset-type': 'file',
    'ruleset-name': '',
    'ruleset-behavior': RulesetBehavior.Domain,
    'ruleset-format': RulesetFormat.Mrs,
    'ruleset-proxy': '',
    'ruleset-interval': 0,
  }
  showModal.value = true
}

defineExpose({ handleAdd })

const handleAddInsertionPoint = () => {
  rules.value.unshift({
    id: RuleType.InsertionPoint,
    type: RuleType.InsertionPoint,
    payload: '',
    proxy: '',
    'no-resolve': false,
    'ruleset-name': '',
    'ruleset-type': 'file',
    'ruleset-behavior': RulesetBehavior.Domain,
    'ruleset-format': RulesetFormat.Mrs,
    'ruleset-proxy': '',
    'ruleset-interval': 0,
  })
}

const handleDeleteRule = (index: number) => {
  rules.value.splice(index, 1)
}

const handleEditRule = (index: number) => {
  updateRuleId = index
  fields.value = deepClone(rules.value[index]!)
  showModal.value = true
}

const handleAddEnd = () => {
  if (updateRuleId !== -1) {
    rules.value[updateRuleId] = fields.value
  } else {
    const index = rules.value.findIndex((v) => v.type === RuleType.InsertionPoint)
    if (index !== -1) {
      rules.value.splice(index + 1, 0, fields.value)
    } else {
      rules.value.unshift(fields.value)
    }
  }
}

const handleUseRuleset = (ruleset: RuleSet) => {
  fields.value.payload = ruleset.id
  fields.value['no-resolve'] = ruleset.behavior === RulesetBehavior.Ipcidr
}

const hasLost = (r: ProfileType['rulesConfig'][0]) => {
  if (BuiltInOutbound.includes(r.proxy)) return false
  return !props.profile.proxyGroupsConfig.find((v) => v.id === r.proxy)
}

const notSupport = (r: ProfileType['rulesConfig'][0]) => {
  return (
    !props.profile.advancedConfig['geodata-mode'] &&
    [RuleType.Geoip, RuleType.Geosite].includes(r.type)
  )
}

const showNotSupport = () => message.warn('kernel.rules.needGeodataMode')

const showLost = () => message.warn('kernel.rules.notFound')
</script>

<template>
  <Empty v-if="rules.length === 0 || (rules.length === 1 && !isInsertionPointMissing)">
    <template #description>
      <Button @click="handleAdd" icon="add" type="primary" size="small">
        {{ t('common.add') }}
      </Button>
    </template>
  </Empty>

  <Divider v-if="isInsertionPointMissing">
    <Button @click="handleAddInsertionPoint" type="text" size="small">
      {{ t('kernel.rules.addInsertionPoint') }}
    </Button>
  </Divider>

  <div v-draggable="[rules, DraggableOptions]">
    <Card v-for="(r, index) in rules" :key="r.id" class="mb-2">
      <div v-if="r.type === RuleType.InsertionPoint" class="text-center font-bold">
        <Divider class="cursor-move">
          <Button @click="handleAdd" icon="add" type="text" size="small">
            {{ t('kernel.rules.insertionPoint') }}
          </Button>
        </Divider>
      </div>
      <div v-else class="flex items-center py-2">
        <div class="font-bold">
          <span v-if="hasLost(r)" @click="showLost" class="warn cursor-pointer"> [ ! ] </span>
          <span v-if="notSupport(r)" @click="showNotSupport" class="warn cursor-pointer">
            [ ! ]
          </span>
          {{ generateRule(r, profile.proxyGroupsConfig) }}
        </div>
        <div class="ml-auto">
          <Button @click="handleEditRule(index)" icon="edit" type="text" size="small" />
          <Button @click="handleDeleteRule(index)" icon="delete" type="text" size="small" />
        </div>
      </div>
    </Card>
  </div>

  <Modal
    v-model:open="showModal"
    :on-ok="handleAddEnd"
    title="profile.rule"
    max-width="80"
    max-height="80"
  >
    <div class="form-item">
      {{ t('kernel.rules.type.name') }}
      <Select v-model="fields.type" :options="RulesTypeOptions" />
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
    <div v-if="fields.type === RuleType.RuleSet" class="form-item">
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

    <template v-if="fields.type === RuleType.RuleSet && fields['ruleset-type'] === 'file'">
      <Divider>{{ t('kernel.rules.rulesets') }}</Divider>
      <Empty v-if="rulesetsStore.rulesets.length === 0" :description="t('kernel.rules.empty')" />
      <div class="grid grid-cols-3 gap-8">
        <Card
          v-for="ruleset in rulesetsStore.rulesets"
          :key="ruleset.name"
          @click="handleUseRuleset(ruleset)"
          :selected="fields.payload === ruleset.id"
          :title="ruleset.name"
          v-tips="ruleset.path"
          class="text-12 line-clamp-1"
        >
          {{ ruleset.path }}
        </Card>
      </div>
    </template>

    <template v-if="fields.type === RuleType.RuleSet && fields['ruleset-type'] === 'http'">
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
      <div class="form-item">
        {{ t('kernel.rules.ruleset-interval') }}
        <Input v-model="fields['ruleset-interval']" type="number" />
      </div>
    </template>

    <template v-if="fields.type === RuleType.RuleSet && fields['ruleset-type'] === 'inline'">
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
.warn {
  color: rgb(200, 193, 11);
}
</style>
