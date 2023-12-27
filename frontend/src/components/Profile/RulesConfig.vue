<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'

import { useMessage } from '@/hooks'
import { deepClone, sampleID, generateRule } from '@/utils'
import { type ProfileType, useRulesetsStore, type RuleSetType } from '@/stores'
import { RulesTypeOptions, RulesetBehavior, DraggableOptions } from '@/constant'

interface Props {
  modelValue: ProfileType['rulesConfig']
  proxyGroups: ProfileType['proxyGroupsConfig']
  profile: ProfileType
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

const emits = defineEmits(['update:modelValue'])

let updateRuleId = 0
const showModal = ref(false)
const rules = ref(deepClone(props.modelValue))

const fields = ref({
  id: sampleID(),
  type: 'DOMAIN',
  payload: '',
  proxy: '',
  'no-resolve': false,
  filter: ''
})

const proxyOptions = computed(() => [
  { label: 'DIRECT', value: 'DIRECT' },
  { label: 'REJECT', value: 'REJECT' },
  ...props.proxyGroups.map(({ name }) => ({ label: name, value: name }))
])

const supportNoResolve = computed(() =>
  ['GEOIP', 'IP-CIDR', 'IP-CIDR6', 'SCRIPT', 'RULE-SET'].includes(fields.value.type)
)

const supportPayload = computed(() => !['MATCH', 'RULE-SET'].includes(fields.value.type))

const filteredRulesTypeOptions = computed(() =>
  RulesTypeOptions.filter(
    ({ value }) => props.profile.advancedConfig['geodata-mode'] || !value.startsWith('GEO')
  )
)

const { t } = useI18n()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()

const handleAddRule = () => {
  updateRuleId = -1
  fields.value = {
    id: sampleID(),
    type: 'DOMAIN',
    payload: '',
    proxy: '',
    'no-resolve': false,
    filter: ''
  }
  showModal.value = true
}

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
    rules.value.push(fields.value)
  }
}

const handleUseRuleset = (ruleset: RuleSetType) => {
  fields.value.payload = ruleset.id
  fields.value['no-resolve'] = ruleset.behavior === RulesetBehavior.Ipcidr
}

const notSupport = (r: ProfileType['rulesConfig'][0]) => {
  return r.type.startsWith('GEO') && !props.profile.advancedConfig['geodata-mode']
}

const showNotSupport = () => {
  message.info('kernel.rules.needGeodataMode')
}

watch(rules, (v) => emits('update:modelValue', v), { immediate: true, deep: true })
</script>

<template>
  <div>
    <div v-draggable="[rules, DraggableOptions]">
      <Card v-for="(r, index) in rules" :key="r.id" class="rules-item">
        <div class="name">
          <span v-if="notSupport(r)" @click="showNotSupport" class="not-support"> [ ! ] </span>
          {{ generateRule(r) }}
        </div>
        <div class="action">
          <Button @click="handleEditRule(index)" type="text" size="small">
            {{ t('common.edit') }}
          </Button>
          <Button @click="handleDeleteRule(index)" type="text" size="small">
            {{ t('common.delete') }}
          </Button>
        </div>
      </Card>
    </div>

    <div style="display: flex; justify-content: center">
      <Button type="link" @click="handleAddRule">{{ t('common.add') }}</Button>
    </div>
  </div>

  <Modal v-model:open="showModal" @ok="handleAddEnd" max-width="80" max-height="80">
    <div class="form-item">
      {{ t('kernel.rules.type.name') }}
      <Select v-model="fields.type" :options="filteredRulesTypeOptions" />
    </div>
    <div v-show="supportPayload" class="form-item">
      {{ t('kernel.rules.payload') }}
      <Input v-model="fields.payload" autofocus />
    </div>
    <div class="form-item">
      {{ t('kernel.rules.proxy') }}
      <Select v-model="fields.proxy" :options="proxyOptions" />
    </div>
    <div v-show="supportNoResolve" class="form-item">
      {{ t('kernel.rules.no-resolve') }}
      <Switch v-model="fields['no-resolve']" />
    </div>

    <template v-if="fields.type === 'RULE-SET'">
      <Divider>{{ t('kernel.rules.rulesets') }}</Divider>
      <div class="rulesets">
        <Card
          v-for="ruleset in rulesetsStore.rulesets"
          :key="ruleset.name"
          @click="handleUseRuleset(ruleset)"
          :selected="fields.payload === ruleset.id"
          :title="ruleset.name"
          class="ruleset"
        >
          {{ ruleset.path }}
        </Card>
      </div>
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
    .not-support {
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
  }
}
</style>
