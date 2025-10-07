<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'

import { getProvidersRules, updateProvidersRules } from '@/api/kernel'
import { RemoveFile, WriteFile, BrowserOpenURL } from '@/bridge'
import { DraggableOptions } from '@/constant'
import { View } from '@/enums/app'
import { RulesetFormat } from '@/enums/kernel'
import {
  type RuleSet,
  useRulesetsStore,
  useAppSettingsStore,
  useEnvStore,
  useKernelApiStore,
} from '@/stores'
import {
  debounce,
  formatRelativeTime,
  ignoredError,
  formatDate,
  stringifyNoFolding,
  message,
} from '@/utils'

import { useModal } from '@/components/Modal'

import RulesetForm from './components/RulesetForm.vue'
import RulesetHub from './components/RulesetHub.vue'
import RulesetView from './components/RulesetView.vue'

import type { Menu } from '@/types/app'

const yamlMenuList: Menu[] = [
  {
    label: 'rulesets.editRuleset',
    handler: (id: string) => handleEditRulesetList(id),
  },
  {
    label: 'common.openFile',
    handler: (id: string) => {
      const ruleset = rulesetsStore.getRulesetById(id)
      BrowserOpenURL(envStore.env.basePath + '/' + ruleset!.path)
    },
  },
  {
    label: 'common.clear',
    handler: (id: string) => handleClearRuleset(id),
  },
]

const mrsMenuList: Menu[] = [
  {
    label: 'common.none',
    handler: (id: string) => {
      console.log(id)
      message.info('common.none')
    },
  },
]

const { t } = useI18n()
const [Modal, modalApi] = useModal({})
const envStore = useEnvStore()
const rulesetsStore = useRulesetsStore()
const kernelApiStore = useKernelApiStore()
const appSettingsStore = useAppSettingsStore()

const handleImportRuleset = async () => {
  modalApi.setProps({
    title: 'rulesets.hub',
    cancelText: 'common.close',
    height: '90',
    width: '90',
    submit: false,
    maskClosable: true,
  })
  modalApi.setContent(RulesetHub)
  modalApi.open()
}

const handleShowRulesetForm = async (id?: string, isUpdate = false) => {
  modalApi.setProps({
    title: isUpdate ? 'common.edit' : 'common.add',
    maxHeight: '90',
    minWidth: '70',
  })
  modalApi.setContent(RulesetForm, { id, isUpdate })
  modalApi.open()
}

const handleUpdateRulesets = async () => {
  try {
    await rulesetsStore.updateRulesets()
    await _updateAllProvidersRules()
    message.success('common.success')
  } catch (error: any) {
    console.error('updateRulesets: ', error)
    message.error(error)
  }
}

const handleEditRulesetList = (id: string) => {
  const name = rulesetsStore.getRulesetById(id)?.name
  modalApi.setProps({
    title: name,
    height: '90',
    width: '90',
    onOk: async () => {
      if (!name) return
      try {
        await _updateProvidersRules(name)
      } catch (error: any) {
        message.error(error)
        console.log(error)
      }
    },
  })
  modalApi.setContent(RulesetView, { id })
  modalApi.open()
}

const handleUpdateRuleset = async (r: RuleSet) => {
  try {
    await rulesetsStore.updateRuleset(r.id)
    await _updateProvidersRules(r.name)
  } catch (error: any) {
    console.error('updateRuleset: ', error)
    message.error(error)
  }
}

const handleDeleteRuleset = async (r: RuleSet) => {
  try {
    await ignoredError(RemoveFile, r.path)
    await rulesetsStore.deleteRuleset(r.id)
  } catch (error: any) {
    console.error('deleteRuleset: ', error)
    message.error(error)
  }
}

const handleDisableRuleset = async (r: RuleSet) => {
  r.disabled = !r.disabled
  rulesetsStore.editRuleset(r.id, r)
}

const handleClearRuleset = async (id: string) => {
  const r = rulesetsStore.getRulesetById(id)
  if (!r) return

  try {
    await WriteFile(r.path, stringifyNoFolding({ payload: [] }))
    await _updateProvidersRules(r.name)
    r.count = 0
    rulesetsStore.editRuleset(r.id, r)
  } catch (error: any) {
    message.error(error)
    console.log(error)
  }
}

const _updateProvidersRules = async (ruleset: string) => {
  if (kernelApiStore.running) {
    const { providers } = await getProvidersRules()
    if (providers[ruleset]) {
      await updateProvidersRules(ruleset)
    }
  }
}

const _updateAllProvidersRules = async () => {
  if (kernelApiStore.running) {
    const { providers } = await getProvidersRules()
    const rulesets = Object.keys(providers)
    for (let i = 0; i < rulesets.length; i++) {
      await updateProvidersRules(rulesets[i]!)
    }
  }
}

const generateMenus = (r: RuleSet) => {
  return {
    [RulesetFormat.Yaml]: yamlMenuList,
    [RulesetFormat.Mrs]: mrsMenuList,
  }[r.format].map((v) => ({ ...v, handler: () => v.handler?.(r.id) }))
}

const noUpdateNeeded = computed(() => rulesetsStore.rulesets.every((v) => v.disabled))

const onSortUpdate = debounce(rulesetsStore.saveRulesets, 1000)
</script>

<template>
  <div v-if="rulesetsStore.rulesets.length === 0" class="grid-list-empty">
    <Empty>
      <template #description>
        <I18nT keypath="rulesets.empty" tag="div" scope="global" class="flex items-center mt-12">
          <template #action>
            <Button @click="handleShowRulesetForm()" type="link">{{ t('common.add') }}</Button>
          </template>
          <template #import>
            <Button @click="handleImportRuleset" type="link">{{ t('rulesets.hub') }}</Button>
          </template>
        </I18nT>
      </template>
    </Empty>
  </div>

  <div v-else class="grid-list-header">
    <Radio
      v-model="appSettingsStore.app.rulesetsView"
      :options="[
        { label: 'common.grid', value: View.Grid },
        { label: 'common.list', value: View.List },
      ]"
    />
    <Button @click="handleImportRuleset" type="link" class="ml-auto">
      {{ t('rulesets.hub') }}
    </Button>
    <Button
      @click="handleUpdateRulesets"
      :disabled="noUpdateNeeded"
      :type="noUpdateNeeded ? 'text' : 'link'"
    >
      {{ t('common.updateAll') }}
    </Button>
    <Button @click="handleShowRulesetForm()" type="primary" icon="add" class="ml-16">
      {{ t('common.add') }}
    </Button>
  </div>

  <div
    v-draggable="[rulesetsStore.rulesets, { ...DraggableOptions, onUpdate: onSortUpdate }]"
    :class="'grid-list-' + appSettingsStore.app.rulesetsView"
  >
    <Card
      v-for="r in rulesetsStore.rulesets"
      :key="r.id"
      :title="r.name"
      :disabled="r.disabled"
      v-menu="generateMenus(r)"
      class="grid-list-item"
    >
      <template #title-prefix>
        <Tag v-if="r.updating" color="cyan">
          {{ t('ruleset.updating') }}
        </Tag>
      </template>

      <template v-if="appSettingsStore.app.rulesetsView === View.Grid" #extra>
        <Dropdown>
          <Button type="link" size="small" icon="more" />
          <template #overlay>
            <div class="flex flex-col gap-4 min-w-64 p-4">
              <Button
                :disabled="r.disabled"
                :loading="r.updating"
                type="text"
                size="small"
                @click="handleUpdateRuleset(r)"
              >
                {{ t('common.update') }}
              </Button>
              <Button type="text" size="small" @click="handleDisableRuleset(r)">
                {{ r.disabled ? t('common.enable') : t('common.disable') }}
              </Button>
              <Button type="text" size="small" @click="handleShowRulesetForm(r.id, true)">
                {{ t('common.edit') }}
              </Button>
              <Button type="text" size="small" @click="handleDeleteRuleset(r)">
                {{ t('common.delete') }}
              </Button>
            </div>
          </template>
        </Dropdown>
      </template>

      <template v-else #extra>
        <Button
          :disabled="r.disabled"
          :loading="r.updating"
          type="text"
          size="small"
          @click="handleUpdateRuleset(r)"
        >
          {{ t('common.update') }}
        </Button>
        <Button type="text" size="small" @click="handleDisableRuleset(r)">
          {{ r.disabled ? t('common.enable') : t('common.disable') }}
        </Button>
        <Button type="text" size="small" @click="handleShowRulesetForm(r.id, true)">
          {{ t('common.edit') }}
        </Button>
        <Button type="text" size="small" @click="handleDeleteRuleset(r)">
          {{ t('common.delete') }}
        </Button>
      </template>

      <div>
        {{ t('ruleset.behavior.name') }}
        :
        {{ r.behavior || '--' }}
      </div>

      <template v-if="appSettingsStore.app.rulesetsView === View.Grid">
        <div v-if="r.format === RulesetFormat.Yaml">
          {{ t('rulesets.rulesetCount') }}
          :
          {{ r.count }}
        </div>
        <div v-else>
          {{ t('ruleset.format.name') }}
          :
          {{ r.format }}
        </div>
        <div>
          {{ t('common.updateTime') }}
          :
          {{ r.updateTime ? formatRelativeTime(r.updateTime) : '--' }}
        </div>
      </template>
      <template v-else>
        <div v-if="r.format === RulesetFormat.Yaml">
          {{ t('rulesets.rulesetCount') }}
          :
          {{ r.count }}
        </div>
        <div v-else>
          {{ t('ruleset.format.name') }}
          :
          {{ r.format }}
        </div>
        <div>
          {{ t('common.updateTime') }}
          :
          {{ r.updateTime ? formatDate(r.updateTime, 'YYYY-MM-DD HH:mm:ss') : '--' }}
        </div>
      </template>
    </Card>
  </div>

  <Modal />
</template>
