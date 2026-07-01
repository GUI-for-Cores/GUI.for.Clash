<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'

import { RemoveFile, WriteFile, OpenURI } from '@/bridge'
import { DraggableOptions } from '@/constant/app'
import { BuiltInOutbound } from '@/constant/kernel'
import { View } from '@/enums/app'
import { RulesetBehavior, RulesetFormat, RuleType } from '@/enums/kernel'
import {
  useRulesetsStore,
  useAppSettingsStore,
  useEnvStore,
  useProfilesStore,
} from '@/stores'
import {
  debounce,
  formatRelativeTime,
  ignoredError,
  formatDate,
  stringifyNoFolding,
  message,
  picker,
  sampleID,
  deepClone,
} from '@/utils'

import { useModal } from '@/components/Modal'


import RulesetForm from './components/RulesetForm.vue'
import RulesetHub from './components/RulesetHub.vue'
import RulesetView from './components/RulesetView.vue'

const yamlMenuList: App.Menu[] = [
  {
    label: 'rulesets.editRuleset',
    handler: (id: string) => handleEditRulesetList(id),
  },
  {
    label: 'common.openFile',
    handler: async (id: string) => {
      const ruleset = rulesetsStore.getRulesetById(id)
      await OpenURI(envStore.env.basePath + '/' + ruleset!.path)
    },
  },
  {
    label: 'common.clear',
    handler: (id: string) => handleClearRuleset(id),
  },
]

const { t } = useI18n()
const [Modal, modalApi] = useModal({})
const envStore = useEnvStore()
const rulesetsStore = useRulesetsStore()
const appSettingsStore = useAppSettingsStore()
const profilesStore = useProfilesStore()

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
    message.success('common.success')
  } catch (error: any) {
    console.error('updateRulesets: ', error)
    message.error(error)
  }
}

const handleEditRulesetList = (id: string) => {
  modalApi.setProps({
    title: rulesetsStore.getRulesetById(id)?.name,
    height: '90',
    width: '90',
  })
  modalApi.setContent(RulesetView, { id })
  modalApi.open()
}

const handleUpdateRuleset = async (r: App.RuleSet) => {
  try {
    await rulesetsStore.updateRuleset(r.id)
  } catch (error: any) {
    console.error('updateRuleset: ', error)
    message.error(error)
  }
}

const handleDeleteRuleset = async (r: App.RuleSet) => {
  try {
    await ignoredError(RemoveFile, r.path)
    await rulesetsStore.deleteRuleset(r.id)
  } catch (error: any) {
    console.error('deleteRuleset: ', error)
    message.error(error)
  }
}

const handleDisableRuleset = async (r: App.RuleSet) => {
  r.disabled = !r.disabled
  rulesetsStore.editRuleset(r.id, r)
}

const handleClearRuleset = async (id: string) => {
  const r = rulesetsStore.getRulesetById(id)
  if (!r) return

  try {
    await WriteFile(r.path, stringifyNoFolding({ payload: [] }))
    r.count = 0
    rulesetsStore.editRuleset(r.id, r)
  } catch (error: any) {
    message.error(error)
    console.log(error)
  }
}

const handleAddRulesetToProfile = async (id: string) => {
  const ruleset = rulesetsStore.getRulesetById(id)
  if (!ruleset) return

  try {
    const { items } = await picker.resource('profile', 'profiles.select', { min: 1, max: 1 })
    const profile = items[0]
    if (!profile) return

    const insertionPointIndex = profile.rulesConfig.findIndex(
      (rule) => rule.type === RuleType.InsertionPoint,
    )

    if (insertionPointIndex === -1) {
      message.warn('kernel.rules.missingInsertionPoint')
      return
    }

    if (profile.rulesConfig.some((rule) => rule.type === RuleType.RuleSet && rule.payload === id)) {
      message.info('common.added')
      return
    }

    const outboundOptions = [
      ...BuiltInOutbound.map((outbound) => ({ label: outbound, value: outbound })),
      ...profile.proxyGroupsConfig.map((group) => ({
        label: group.name,
        value: group.id,
        description: group.type,
      })),
    ]
    const target = await picker.single('kernel.rules.proxy', outboundOptions, [
      profile.proxyGroupsConfig[0]?.id || BuiltInOutbound[0]!,
    ])

    if (!target) return

    const nextProfile = deepClone(profile)
    nextProfile.rulesConfig.splice(insertionPointIndex + 1, 0, {
      id: sampleID(),
      type: RuleType.RuleSet,
      enable: true,
      payload: ruleset.id,
      proxy: target,
      'no-resolve': ruleset.behavior === RulesetBehavior.Ipcidr,
      'ruleset-name': '',
      'ruleset-type': 'file',
      'ruleset-behavior': ruleset.behavior,
      'ruleset-format': ruleset.format,
      'ruleset-proxy': '',
      'ruleset-interval': 0,
    })

    await profilesStore.editProfile(nextProfile.id, nextProfile)
    message.success('common.success')
  } catch (error) {
    message.error(error)
  }
}

const generateMenus = (r: App.RuleSet) => {
  const addToProfileMenu: App.Menu = {
    label: 'rulesets.addToProfile',
    handler: (id: string) => handleAddRulesetToProfile(id),
  }

  return {
    [RulesetFormat.Yaml]: [addToProfileMenu, ...yamlMenuList],
    [RulesetFormat.Mrs]: [addToProfileMenu],
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
            <Button type="link" @click="handleShowRulesetForm()">{{ t('common.add') }}</Button>
          </template>
          <template #import>
            <Button type="link" @click="handleImportRuleset">{{ t('rulesets.hub') }}</Button>
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
    <Button type="link" class="ml-auto" @click="handleImportRuleset">
      {{ t('rulesets.hub') }}
    </Button>
    <Button
      :disabled="noUpdateNeeded"
      :type="noUpdateNeeded ? 'text' : 'link'"
      @click="handleUpdateRulesets"
    >
      {{ t('common.updateAll') }}
    </Button>
    <Button type="primary" icon="add" class="ml-16" @click="handleShowRulesetForm()">
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
      v-menu="generateMenus(r)"
      :title="r.name"
      :disabled="r.disabled"
      class="grid-list-item"
    >
      <template #title-prefix>
        <Tag v-if="r.updating" color="cyan" size="small">
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
                @click="handleUpdateRuleset(r)"
              >
                {{ t('common.update') }}
              </Button>
              <Button type="text" @click="handleDisableRuleset(r)">
                {{ r.disabled ? t('common.enable') : t('common.disable') }}
              </Button>
              <Button type="text" @click="handleShowRulesetForm(r.id, true)">
                {{ t('common.edit') }}
              </Button>
              <Button type="text" @click="handleDeleteRuleset(r)">
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
