<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { deepClone, sampleID } from '@/utils'
import { useMessage } from '@/hooks'
import { generateRule } from '@/utils/generator'
import { type ProfileType } from '@/stores/profiles'
import { RulesTypeOptions } from '@/constant/kernel'
import { BuiltInRuleSets, type RuleSet } from '@/constant/profile'

interface Props {
  modelValue: ProfileType['rulesConfig']
  proxyGroups: ProfileType['proxyGroupsConfig']
  profile: ProfileType
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

const emits = defineEmits(['update:modelValue'])

let dragIndex = -1
let updateRuleId = 0
const showModal = ref(false)
const rules = ref(deepClone(props.modelValue))

const fields = ref({
  id: sampleID(),
  type: 'DOMAIN',
  payload: '',
  proxy: '',
  'no-resolve': true,
  filter: '',
  path: ''
})

const proxyOptions = computed(() => [
  { label: 'DIRECT', value: 'DIRECT' },
  { label: 'REJECT', value: 'REJECT' },
  ...props.proxyGroups.map(({ name }) => ({ label: name, value: name }))
])

const supportNoResolve = computed(() =>
  ['GEOIP', 'IP-CIDR', 'IP-CIDR6', 'SCRIPT'].includes(fields.value.type)
)

const supportPayload = computed(() => fields.value.type !== 'MATCH')

const filteredRulesTypeOptions = computed(() =>
  RulesTypeOptions.filter(
    ({ value }) => props.profile.advancedConfig['geodata-mode'] || !value.startsWith('GEO')
  )
)

const { t } = useI18n()
const { message } = useMessage()

const handleAddRule = () => {
  updateRuleId = -1
  fields.value = {
    id: sampleID(),
    type: 'DOMAIN',
    payload: '',
    proxy: '',
    'no-resolve': true,
    filter: '',
    path: ''
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

const handleUseRuleset = (ruleset: RuleSet) => {
  fields.value.payload = ruleset.name
  fields.value.path = ruleset.path
}

const notSupport = (r: ProfileType['rulesConfig'][0]) => {
  return r.type.startsWith('GEO') && !props.profile.advancedConfig['geodata-mode']
}

const showNotSupport = () => {
  message.info(t('kernel.rules.needGeodataMode'))
}

const onDragStart = (e: any, index: number) => {
  dragIndex = index
}

const onDragEnter = (e: any, index: number) => {
  e.preventDefault()
  if (dragIndex !== index) {
    const source = rules.value[dragIndex]
    rules.value.splice(dragIndex, 1)
    rules.value.splice(index, 0, source)
    dragIndex = index
  }
}

const onDragOver = (e: any) => e.preventDefault()

watch(rules, (v) => emits('update:modelValue', v), { immediate: true })
</script>

<template>
  <div>
    <TransitionGroup name="drag" tag="div">
      <Card
        v-for="(r, index) in rules"
        :key="r.id"
        @dragenter="onDragEnter($event, index)"
        @dragover="onDragOver($event)"
        @dragstart="onDragStart($event, index)"
        class="rules-item"
        draggable="true"
      >
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
    </TransitionGroup>

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
    <div v-show="fields.type === 'RULE-SET'" class="form-item">
      {{ t('kernel.rules.ruleset') }}
      <Input v-model="fields['path']" placeholder="data/rulesets/filename.yaml" />
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
          v-for="ruleset in BuiltInRuleSets"
          :key="ruleset.name"
          @click="handleUseRuleset(ruleset)"
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
.drag-move {
  transition: transform 0.4s;
}
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
  .ruleset {
    width: 33.3333%;
    margin: 0 8px;
    font-size: 10px;
  }
}
</style>
