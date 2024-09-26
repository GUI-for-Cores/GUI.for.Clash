<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMessage } from '@/hooks'
import { ignoredError } from '@/utils'
import { HttpGet, Readfile, Writefile } from '@/bridge'
import { usePluginsStore, type PluginType } from '@/stores'

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
const { message } = useMessage()
const pluginsStore = usePluginsStore()

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

const handleAddPlugin = async (ruleset: RulesetHub['list'][number]) => {
  // try {
  //   await pluginsStore.addPlugin(ruleset)
  //   // Try to autoload the plugin
  //   await ignoredError(pluginsStore.reloadPlugin, ruleset)
  //   pluginsStore.updatePluginTrigger(ruleset)
  //   const { id } = message.info('plugins.updating')
  //   await pluginsStore.updatePlugin(ruleset.id)
  //   message.update(id, 'common.success', 'success')
  // } catch (error: any) {
  //   console.error(error)
  //   message.error(error.message || error)
  // }
}

const isAlreadyAdded = (id: string) => pluginsStore.getPluginById(id)

getList()
</script>

<template>
  <div class="ruleset-hub">
    <div v-if="loading" class="loading">
      <Button type="text" loading></Button>
    </div>
    <template v-else>
      <div class="header">
        <Button type="text">{{ t('plugins.total') }} : {{ rulesetHub.list.length }}</Button>
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
          <div>{{ ruleset.count }}</div>
          <div class="action">
            <Button type="link" size="small">
              {{ t('ruleset.format.mrs') }}
            </Button>
            <Button @click="handleAddPlugin(ruleset)" type="link" size="small">
              {{ t('ruleset.format.yaml') }}
            </Button>
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

    .description {
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
  overflow: auto;
}
</style>
