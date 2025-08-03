<script setup lang="ts">
import { computed, h, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { HttpGet } from '@/bridge'
import { RulesetBehavior, RulesetFormat } from '@/enums/kernel'
import { useRulesetsStore, type RulesetHub } from '@/stores'
import { message, alert } from '@/utils'

import Button from '@/components/Button/index.vue'
import Pagination from '@/components/Pagination/index.vue'

const pageSize = 27
const currentPage = ref(1)

const { t } = useI18n()
const rulesetsStore = useRulesetsStore()

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

const getRulesetUrl = (ruleset: RulesetHub['list'][number], format: RulesetFormat) => {
  const basrUrl = {
    geosite: rulesetsStore.rulesetHub.geosite,
    geoip: rulesetsStore.rulesetHub.geoip,
  }[ruleset.type]
  return basrUrl + ruleset.name + '.' + format
}

const handleAddRuleset = async (ruleset: RulesetHub['list'][number], format: RulesetFormat) => {
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

const handlePreview = async (ruleset: RulesetHub['list'][number], format: RulesetFormat) => {
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

const isAlreadyAdded = (id: string) => rulesetsStore.getRulesetById(id)

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
        <Button @click="handleUpdatePluginHub" icon="refresh" size="small">
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
                @click="handlePreview(ruleset, RulesetFormat.Yaml)"
                icon="preview"
                size="small"
                type="text"
              />
            </div>
            <!-- <div v-tips="ruleset.description" class="flex-1 line-clamp-2">
              {{ ruleset.description || t('rulesets.noDesc') }}
            </div> -->
            <div class="flex items-center justify-end">
              <template
                v-if="isAlreadyAdded(ruleset.type + '_' + ruleset.name + '.' + RulesetFormat.Yaml)"
              >
                <Button type="text" size="small">
                  {{ t('ruleset.format.yaml') }} {{ t('common.added') }}
                </Button>
              </template>
              <template v-else>
                <Button
                  @click="handleAddRuleset(ruleset, RulesetFormat.Yaml)"
                  type="link"
                  size="small"
                >
                  {{ t('common.add') }} {{ t('ruleset.format.yaml') }}
                </Button>
              </template>
              <template
                v-if="isAlreadyAdded(ruleset.type + '_' + ruleset.name + '.' + RulesetFormat.Mrs)"
              >
                <Button type="text" size="small">
                  {{ t('ruleset.format.mrs') }} {{ t('common.added') }}
                </Button>
              </template>
              <template v-else>
                <Button
                  @click="handleAddRuleset(ruleset, RulesetFormat.Mrs)"
                  type="link"
                  size="small"
                >
                  {{ t('common.add') }} {{ t('ruleset.format.mrs') }}
                </Button>
              </template>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
