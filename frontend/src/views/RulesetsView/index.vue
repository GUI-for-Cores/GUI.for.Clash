<script setup lang="ts">
import { stringify } from 'yaml'
import { computed, ref } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'

import { View } from '@/constant'
import { useMessage } from '@/hooks'
import { Writefile } from '@/utils/bridge'
import { formatRelativeTime } from '@/utils'
import { updateProvidersRules } from '@/api/kernel'
import { type RuleSetType, type Menu, useRulesetsStore, useAppSettingsStore } from '@/stores'

import RulesetForm from './components/RulesetForm.vue'
import RulesetView from './components/RulesetView.vue'

const showRulesetForm = ref(false)
const showRulesetList = ref(false)
const rulesetTitle = ref('')
const rulesetFormID = ref()
const rulesetFormIsUpdate = ref(false)
const subFormTitle = computed(() =>
  rulesetFormIsUpdate.value ? t('common.edit') : t('common.add')
)

const menuList: Menu[] = [
  {
    label: 'rulesets.editRuleset',
    handler: (r: RuleSetType) => handleEditRulesetList(r)
  },
  {
    label: 'common.clear',
    handler: (r: RuleSetType) => handleClearRuleset(r)
  }
]

const { t } = useI18n()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()
const appSettingsStore = useAppSettingsStore()

const handleAddRuleset = async () => {
  rulesetFormIsUpdate.value = false
  showRulesetForm.value = true
}

const handleUpdateRulesets = async () => {
  try {
    await rulesetsStore.updateRulesets()
    message.info('common.success')
  } catch (error: any) {
    console.error('updateRulesets: ', error)
    message.info(error)
  }
}

const handleEditRuleset = (r: RuleSetType) => {
  rulesetFormIsUpdate.value = true
  rulesetFormID.value = r.id
  showRulesetForm.value = true
}

const handleEditRulesetList = (r: RuleSetType) => {
  rulesetFormID.value = r.id
  rulesetTitle.value = r.name
  showRulesetList.value = true
}

const handleUpdateRuleset = async (r: RuleSetType) => {
  try {
    await rulesetsStore.updateRuleset(r.id)
    await _updateProvidersRules(r.name)
    message.info('common.success')
  } catch (error: any) {
    console.error('updateRuleset: ', error)
    message.info(error)
  }
}

const handleDeleteRuleset = async (s: RuleSetType) => {
  try {
    await rulesetsStore.deleteRuleset(s.id)
    message.info('common.success')
  } catch (error: any) {
    console.error('deleteRuleset: ', error)
    message.info(error)
  }
}

const handleDisableRuleset = async (r: RuleSetType) => {
  r.disabled = !r.disabled
  rulesetsStore.editRuleset(r.id, r)
  message.info('common.success')
}

const handleClearRuleset = async (r: RuleSetType) => {
  try {
    await Writefile(r.path, stringify({ payload: [] }))
    await _updateProvidersRules(r.name)
    r.count = 0
    rulesetsStore.editRuleset(r.id, r)
    message.info('common.success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const _updateProvidersRules = async (ruleset: string) => {
  if (appSettingsStore.app.kernel.running) {
    await updateProvidersRules(ruleset)
  }
}

const noUpdateNeeded = computed(() => rulesetsStore.rulesets.every((v) => v.disabled))
</script>

<template>
  <div v-if="rulesetsStore.rulesets.length !== 0" class="header">
    <Radio
      v-model="appSettingsStore.app.rulesetsView"
      :options="[
        { label: 'common.grid', value: View.Grid },
        { label: 'common.list', value: View.List }
      ]"
    />
    <Button
      @click="handleUpdateRulesets"
      :disable="noUpdateNeeded"
      :type="noUpdateNeeded ? 'text' : 'link'"
      style="margin-left: auto"
    >
      {{ t('common.updateAll') }}
    </Button>
    <Button @click="handleAddRuleset" type="primary">
      {{ t('common.add') }}
    </Button>
  </div>

  <div v-if="rulesetsStore.rulesets.length === 0" class="empty">
    <Empty>
      <template #description>
        <I18nT keypath="rulesets.empty" tag="p">
          <template #action>
            <Button @click="handleAddRuleset" type="link">{{ t('common.add') }}</Button>
          </template>
        </I18nT>
      </template>
    </Empty>
  </div>

  <div class="rulesets" :class="appSettingsStore.app.rulesetsView">
    <Card
      v-for="r in rulesetsStore.rulesets"
      :key="r.name"
      :title="r.name"
      :disabled="r.disabled"
      v-menu="menuList.map((v) => ({ ...v, handler: () => v.handler?.(r) }))"
      class="ruleset"
    >
      <template #title-prefix>
        <Tag v-if="r.updating" color="cyan">
          {{ t('ruleset.updating') }}
        </Tag>
      </template>

      <template v-if="appSettingsStore.app.rulesetsView === View.Grid" #extra>
        <Dropdown :trigger="['hover', 'click']">
          <Button type="link" size="small">
            {{ t('common.more') }}
          </Button>
          <template #overlay>
            <Button
              :disable="r.disabled"
              :loading="r.updating"
              :type="r.disabled ? 'text' : 'link'"
              size="small"
              @click="handleUpdateRuleset(r)"
            >
              {{ t('common.update') }}
            </Button>
            <Button type="link" size="small" @click="handleDisableRuleset(r)">
              {{ r.disabled ? t('common.enable') : t('common.disable') }}
            </Button>
            <Button type="link" size="small" @click="handleEditRuleset(r)">
              {{ t('common.edit') }}
            </Button>
            <Button type="link" size="small" @click="handleDeleteRuleset(r)">
              {{ t('common.delete') }}
            </Button>
          </template>
        </Dropdown>
      </template>

      <template v-else #extra>
        <Button
          :disable="r.disabled"
          :loading="r.updating"
          :type="r.disabled ? 'text' : 'link'"
          size="small"
          @click="handleUpdateRuleset(r)"
        >
          {{ t('common.update') }}
        </Button>
        <Button type="link" size="small" @click="handleDisableRuleset(r)">
          {{ r.disabled ? t('common.enable') : t('common.disable') }}
        </Button>
        <Button type="link" size="small" @click="handleEditRuleset(r)">
          {{ t('common.edit') }}
        </Button>
        <Button type="link" size="small" @click="handleDeleteRuleset(r)">
          {{ t('common.delete') }}
        </Button>
      </template>

      <div>
        {{ t('rulesets.rulesetCount') }}
        :
        <Button type="text" size="small">
          {{ r.count }}
        </Button>
      </div>
      <div>
        {{ t('ruleset.behavior.name') }}
        :
        {{ r.behavior || '--' }}
      </div>

      <template v-if="appSettingsStore.app.rulesetsView === View.Grid">
        <div>
          {{ t('common.updateTime') }}
          :
          {{ r.updateTime ? formatRelativeTime(r.updateTime) : '--' }}
        </div>
      </template>
      <template v-else>
        <div>
          {{ t('common.updateTime') }}
          :
          {{ r.updateTime || '--' }}
        </div>
      </template>
    </Card>
  </div>

  <Modal v-model:open="showRulesetForm" :title="subFormTitle" max-height="80" :footer="false">
    <RulesetForm :is-update="rulesetFormIsUpdate" :id="rulesetFormID" />
  </Modal>

  <Modal
    v-model:open="showRulesetList"
    :title="rulesetTitle"
    :footer="false"
    height="80"
    width="80"
  >
    <RulesetView :id="rulesetFormID" />
  </Modal>
</template>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 9;
}

.empty {
  text-align: center;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rulesets {
  flex: 1;
  margin-top: 8px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
}

.grid {
  .ruleset {
    display: inline-block;
    width: calc(33.333333% - 16px);
    margin: 8px;
  }
}
.list {
  .ruleset {
    margin: 8px;
  }
}
</style>