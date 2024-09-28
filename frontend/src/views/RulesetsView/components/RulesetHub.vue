<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMessage, useAlert } from '@/hooks'
import { ignoredError } from '@/utils'
import { useRulesetsStore } from '@/stores'
import { HttpGet, Readfile, Writefile } from '@/bridge'
import { RulesetBehavior, RulesetFormat } from '@/constant'

type RulesetHub = {
  geosite: string
  geoip: string
  list: { name: string; type: 'geosite' | 'geoip'; description: string; count: number }[]
}

const loading = ref(false)
const rulesetHub = ref<RulesetHub>({ geosite: '', geoip: '', list: [] })
const cacheFile = 'data/.cache/ruleset-list.json'
const hubUrl = 'https://github.com/GUI-for-Cores/Ruleset-Hub/releases/download/latest/meta.json'

const { t } = useI18n()
const { alert } = useAlert()
const { message } = useMessage()
const rulesetsStore = useRulesetsStore()

const keywords = ref('')

const filteredList = computed(() => {
  if (!keywords.value) return rulesetHub.value.list
  return rulesetHub.value.list.filter((ruleset) => ruleset.name.includes(keywords.value))
})

const updateList = async () => {
  loading.value = true
  try {
    const { body } = await HttpGet<string>(hubUrl)
    rulesetHub.value = JSON.parse(body)
    await Writefile(cacheFile, body)
    message.success('plugins.updateSuccess')
  } catch (error: any) {
    message.error(error)
  }
  loading.value = false
}

const getList = async () => {
  const body = await ignoredError(Readfile, cacheFile)
  if (body) {
    rulesetHub.value = JSON.parse(body)
    return
  }

  updateList()
}

const getRulesetUrl = (ruleset: RulesetHub['list'][number], format: RulesetFormat) => {
  const basrUrl = { geosite: rulesetHub.value.geosite, geoip: rulesetHub.value.geoip }[ruleset.type]
  return basrUrl + ruleset.name + '.' + format
}

const handleAddRuleset = async (ruleset: RulesetHub['list'][number], format: RulesetFormat) => {
  const id = ruleset.type + '_' + ruleset.name + '.' + format
  const behavior = { geosite: RulesetBehavior.Domain, geoip: RulesetBehavior.Ipcidr }[ruleset.type]
  try {
    await rulesetsStore.addRuleset({
      id,
      name: ruleset.name,
      updateTime: 0,
      disabled: false,
      type: 'Http',
      behavior,
      format,
      path: 'data/rulesets/' + id,
      url: getRulesetUrl(ruleset, format),
      count: ruleset.count
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

const isAlreadyAdded = (id: string) => rulesetsStore.getRulesetById(id)

getList()
</script>

<template>
  <div class="ruleset-hub">
    <div v-if="loading" class="loading"><Button type="text" loading /></div>
    <template v-else>
      <div class="header">
        <Button type="text">{{ t('rulesets.total') }} : {{ rulesetHub.list.length }}</Button>
        <Input
          v-model="keywords"
          size="small"
          clearable
          auto-size
          :placeholder="t('common.keywords')"
          class="ml-8 flex-1"
        />
        <Button @click="updateList" type="link" class="ml-auto">
          {{ t('plugins.update') }}
        </Button>
      </div>

      <div class="list">
        <Card
          v-for="ruleset in filteredList"
          :key="ruleset.name + ruleset.type"
          :title="ruleset.name"
          class="ruleset-item"
        >
          <template #extra>
            <Tag size="small" color="cyan">{{ ruleset.type }}</Tag>
          </template>
          <div class="count">
            {{ t('rulesets.rulesetCount') }} : {{ ruleset.count }}
            <Button
              @click="handlePreview(ruleset, RulesetFormat.Yaml)"
              icon="preview"
              size="small"
              type="text"
            />
          </div>
          <div class="description">
            {{ ruleset.description || t('rulesets.noDesc') }}
          </div>
          <div class="action">
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
        </Card>
      </div>
    </template>
  </div>
</template>

<style lang="less" scoped>
.ruleset-hub {
  display: flex;
  flex-direction: column;
  height: 100%;

  .ruleset-item {
    display: inline-block;
    margin: 4px;
    font-size: 12px;
    width: calc(33.333% - 8px);
    .count {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .description {
      margin: 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .action {
      text-align: right;
    }
  }
}

.loading {
  display: flex;
  justify-content: center;
  height: 98%;
}

.header {
  display: flex;
  align-items: center;
}

.list {
  padding-bottom: 16px;
  overflow: auto;
}
</style>
