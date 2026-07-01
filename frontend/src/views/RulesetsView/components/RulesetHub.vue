<script setup lang="ts">
import { computed, h, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { HttpGet } from '@/bridge'
import { BuiltInOutbound } from '@/constant/kernel'
import { RulesetBehavior, RulesetFormat, RuleType } from '@/enums/kernel'
import { useProfilesStore, useRulesetsStore } from '@/stores'
import { alert, deepClone, message, picker, sampleID } from '@/utils'

import Button from '@/components/Button/index.vue'
import Pagination from '@/components/Pagination/index.vue'

const pageSize = 27
const rulesetFormats = [RulesetFormat.Yaml, RulesetFormat.Mrs]
const currentPage = ref(1)

const { t } = useI18n()
const rulesetsStore = useRulesetsStore()
const profilesStore = useProfilesStore()

const keywords = ref('')
const handleCancel = inject('cancel') as any

watch(keywords, () => (currentPage.value = 1))

const filteredList = computed(() => {
  if (!keywords.value) return rulesetsStore.rulesetHub.list
  return rulesetsStore.rulesetHub.list.filter((ruleset) => ruleset.name.includes(keywords.value))
})

const currentList = computed(() => {
  return filteredList.value.slice(
    (currentPage.value - 1) * pageSize,
    (currentPage.value - 1) * pageSize + pageSize,
  )
})

const getRulesetUrl = (ruleset: App.RulesetHub['list'][number], format: RulesetFormat) => {
  const basrUrl = {
    geosite: rulesetsStore.rulesetHub.geosite,
    geoip: rulesetsStore.rulesetHub.geoip,
  }[ruleset.type]
  return basrUrl + ruleset.name + '.' + format
}

const handleAddRuleset = async (ruleset: App.RulesetHub['list'][number], format: RulesetFormat) => {
  const id = ruleset.type + '_' + ruleset.name + '.' + format
  const behavior = { geosite: RulesetBehavior.Domain, geoip: RulesetBehavior.Ipcidr }[ruleset.type]
  try {
    await rulesetsStore.addRuleset({
      id,
      name: `${ruleset.name}-${ruleset.type}.${format}`,
      updateTime: 0,
      disabled: false,
      type: 'Http',
      behavior,
      format,
      path: 'data/rulesets/' + id,
      url: getRulesetUrl(ruleset, format),
      count: ruleset.count,
    })
    const { success } = message.info('rulesets.updating')
    await rulesetsStore.updateRuleset(id)
    success('common.success')
  } catch (error: any) {
    console.error(error)
    message.error(error.message || error)
  }
}

const handleAddRulesetToProfile = async (
  ruleset: App.RulesetHub['list'][number],
  format: RulesetFormat,
) => {
  const url = getRulesetUrl(ruleset, format)
  const behavior = { geosite: RulesetBehavior.Domain, geoip: RulesetBehavior.Ipcidr }[ruleset.type]

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

    if (
      profile.rulesConfig.some(
        (rule) =>
          rule.type === RuleType.RuleSet && rule['ruleset-type'] === 'http' && rule.payload === url,
      )
    ) {
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
      payload: url,
      proxy: target,
      'no-resolve': behavior === RulesetBehavior.Ipcidr,
      'ruleset-name': `${ruleset.name}-${ruleset.type}.${format}`,
      'ruleset-type': 'http',
      'ruleset-behavior': behavior,
      'ruleset-format': format,
      'ruleset-proxy': '',
      'ruleset-interval': 0,
    })

    await profilesStore.editProfile(nextProfile.id, nextProfile)
    message.success('common.success')
  } catch (error) {
    message.error(error)
  }
}

const handlePreview = async (ruleset: App.RulesetHub['list'][number], format: RulesetFormat) => {
  const { destroy, error } = message.info('rulesets.fetching', 15_000)
  try {
    const { body } = await HttpGet(getRulesetUrl(ruleset, format))
    destroy()
    await alert(ruleset.name, body)
  } catch (err: any) {
    error(err.message || err)
    setTimeout(destroy, 2000)
  }
}

const handleUpdatePluginHub = async () => {
  try {
    await rulesetsStore.updateRulesetHub()
    message.success('rulesets.updateSuccess')
  } catch (err: any) {
    message.error(err.message || err)
  }
}

const isAlreadyAdded = (ruleset: App.RulesetHub['list'][number], format: RulesetFormat) => {
  const id = ruleset.type + '_' + ruleset.name + '.' + format
  return rulesetsStore.getRulesetById(id)
}

if (rulesetsStore.rulesetHub.list.length === 0) {
  rulesetsStore.updateRulesetHub()
}

const modalSlots = {
  action: () =>
    !rulesetsStore.rulesetHubLoading
      ? h(Pagination, {
          current: currentPage.value,
          'onUpdate:current': (current: number) => (currentPage.value = current),
          total: filteredList.value.length,
          pageSize: pageSize,
          size: 'small',
          class: 'mr-auto',
        })
      : null,
  close: () =>
    h(
      Button,
      {
        type: 'text',
        onClick: handleCancel,
      },
      () => t('common.close'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <div class="h-full">
    <div v-if="rulesetsStore.rulesetHubLoading" class="flex items-center justify-center h-full">
      <Button type="text" loading />
    </div>
    <div v-else class="flex flex-col h-full">
      <div class="flex items-center gap-8">
        <Input
          v-model="keywords"
          :border="false"
          :placeholder="t('rulesets.total') + ': ' + rulesetsStore.rulesetHub.list.length"
          clearable
          size="small"
          class="flex-1"
        />
        <Button icon="refresh" size="small" @click="handleUpdatePluginHub">
          {{ t('plugins.update') }}
        </Button>
      </div>

      <Empty v-if="filteredList.length === 0" />

      <div class="overflow-y-auto grid grid-cols-3 text-12 gap-8 mt-8 pb-16 pr-8">
        <Card
          v-for="ruleset in currentList"
          :key="ruleset.name + ruleset.type"
          :title="ruleset.name"
        >
          <template #extra>
            <Tag size="small" color="cyan">{{ ruleset.type }}</Tag>
          </template>
          <div class="flex flex-col h-full">
            <div class="flex items-center justify-between">
              {{ t('rulesets.rulesetCount') }} : {{ ruleset.count }}
              <Button
                icon="preview"
                size="small"
                type="text"
                @click="handlePreview(ruleset, RulesetFormat.Yaml)"
              />
            </div>
            <div class="flex items-center justify-between">
              <Dropdown :trigger="['hover']" placement="bottom">
                <Button type="text" size="small" style="margin-left: -2px; padding-left: 2px">
                  {{ t('common.more') }}
                </Button>
                <template #overlay>
                  <div class="flex flex-col gap-4 min-w-96 p-4">
                    <Button
                      v-for="format in rulesetFormats"
                      :key="format"
                      :disabled="!!isAlreadyAdded(ruleset, format)"
                      type="text"
                      size="small"
                      @click="handleAddRuleset(ruleset, format)"
                    >
                      <template v-if="isAlreadyAdded(ruleset, format)">
                        {{ t(`ruleset.format.${format}`) }} {{ t('common.added') }}
                      </template>
                      <template v-else>
                        {{ t('common.add') }} {{ t(`ruleset.format.${format}`) }}
                      </template>
                    </Button>
                  </div>
                </template>
              </Dropdown>

              <Dropdown :trigger="['hover']" placement="bottom">
                <Button type="link" size="small">
                  {{ t('rulesets.addToProfile') }}
                </Button>
                <template #overlay>
                  <div class="flex flex-col gap-4 min-w-96 p-4">
                    <Button
                      v-for="format in rulesetFormats"
                      :key="format"
                      type="text"
                      size="small"
                      @click="handleAddRulesetToProfile(ruleset, format)"
                    >
                      {{ t(`ruleset.format.${format}`) }}
                    </Button>
                  </div>
                </template>
              </Dropdown>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
