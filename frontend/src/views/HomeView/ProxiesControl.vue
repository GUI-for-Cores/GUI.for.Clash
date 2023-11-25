<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from '@/hooks/useMessage'
import { useAppSettingsStore } from '@/stores'
import { type Proxy } from '@/api/kernel.schema'
import {
  getProxies,
  getProviders,
  useProxy,
  getGroupDelay,
  getConnections,
  deleteConnection
} from '@/api/kernel'

const expandedSet = ref<Set<string>>(new Set())
const loadingSet = ref<Set<string>>(new Set())
const loading = ref(false)
const proxies = ref<Record<string, Proxy>>({})
const providers = ref<
  Record<
    string,
    {
      name: string
      proxies: Proxy[]
    }
  >
>({})

const { t } = useI18n()
const { message } = useMessage()
const appSettings = useAppSettingsStore()

const groups = computed(() => {
  if (!providers.value.default) return []
  return providers.value.default.proxies
    .concat([proxies.value.GLOBAL])
    .filter((v) => !['Direct', 'Reject'].includes(v.type))
    .map((provider) => {
      const all = provider.all
        .filter((v) => {
          return (
            appSettings.app.kernel.unAvailable ||
            ['DIRECT', 'REJECT'].includes(v) ||
            proxies.value[v].alive
          )
        })
        .map((v) => {
          const delay = proxies.value[v].history[proxies.value[v].history.length - 1]?.delay
          return { ...proxies.value[v], delay }
        })
      return { ...provider, all }
    })
})

const updateGroups = async () => {
  loading.value = true
  try {
    const [{ providers: a }, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    providers.value = a
    proxies.value = b
  } catch (error) {
    // console.log(error)
  }
  loading.value = false
}

const handleUseProxy = async (group: any, proxy: any) => {
  if (group.type === 'URLTest') return

  if (group.now === proxy.name) return

  const promises: Promise<null>[] = []

  if (appSettings.app.kernel.autoClose) {
    const { connections } = await getConnections()
    promises.push(
      ...(connections || [])
        .filter((v) => v.chains.includes(group.name))
        .map((v) => deleteConnection(v.id))
    )
  }

  try {
    await useProxy(group.name, proxy.name)
    await Promise.all(promises)
    updateGroups()
  } catch (error: any) {
    message.info(error)
  }
}

const toggleExpanded = (group: string) => {
  if (expandedSet.value.has(group)) {
    expandedSet.value.delete(group)
  } else {
    expandedSet.value.add(group)
  }
}

const expandAll = () => groups.value.forEach(({ name }) => expandedSet.value.add(name))

const collapseAll = () => expandedSet.value.clear()

const isExpanded = (group: string) => expandedSet.value.has(group)

const isLoading = (group: string) => loadingSet.value.has(group)

const handleGroupDelay = async (group: string) => {
  loadingSet.value.add(group)
  try {
    await getGroupDelay(group)
    await updateGroups()
  } catch (error: any) {
    message.info(error)
  }
  loadingSet.value.delete(group)
}

const delayColor = (delay = 0) => {
  if (delay === 0) return '#f00'
  if (delay < 100) return '#6ec96e'
  if (delay < 200) return '#d98506'
  if (delay < 500) return '#d4451a'
  return '#bc1212'
}

defineExpose({ updateGroups })
</script>

<template>
  <div class="group">
    <div class="header">
      <Switch v-model="appSettings.app.kernel.autoClose">
        {{ t('home.controller.autoClose') }}
      </Switch>
      <Switch v-model="appSettings.app.kernel.unAvailable" style="margin-left: 8px">
        {{ t('home.controller.unAvailable') }}
      </Switch>
      <Button @click="expandAll" type="link" style="margin-left: auto">
        {{ t('home.controller.expandAll') }}
      </Button>
      <Button @click="collapseAll" type="link">
        {{ t('home.controller.collapseAll') }}
      </Button>
      <Button @click="updateGroups" :loading="loading" type="link">
        {{ t('home.controller.refresh') }}
      </Button>
    </div>
  </div>
  <div v-for="group in groups" :key="group.name" class="group">
    <div class="header">
      <div class="group-info">
        <span class="group-name">{{ group.name }}</span>
        <span class="group-type">{{ group.type }}</span>
        <span> :: </span>
        <span class="group-now">{{ group.now }}</span>
      </div>
      <div class="action">
        <Button @click="handleGroupDelay(group.name)" :loading="isLoading(group.name)" type="text">
          <Icon icon="speedTest" />
        </Button>
        <Button @click="toggleExpanded(group.name)" type="text">
          <Icon
            :class="{ 'rotate-z': isExpanded(group.name) }"
            icon="arrowDown"
            class="action-expand"
          />
        </Button>
      </div>
    </div>
    <div v-show="isExpanded(group.name)" class="body">
      <Card
        v-for="proxy in group.all"
        :title="proxy.name"
        :selected="proxy.name === group.now"
        :key="proxy.name"
        @click="handleUseProxy(group, proxy)"
        class="proxy"
      >
        <div :style="{ color: delayColor(proxy.delay) }" class="delay">
          {{ proxy.delay && proxy.delay + 'ms' }}
        </div>
        <div class="type">{{ proxy.type }} {{ proxy.udp && ':: udp' }}</div>
      </Card>
    </div>
  </div>
</template>

<style lang="less" scoped>
.group {
  margin: 8px;

  .header {
    position: sticky;
    z-index: 99;
    top: 0;
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: var(--card-bg);
    border-radius: 8px;
    backdrop-filter: blur(2px);
    .group-info {
      font-weight: normal;
      font-size: 14px;
      display: flex;
      align-items: center;
      .group-name {
        font-weight: bold;
        font-size: 18px;
      }

      .group-type {
        margin: 0 8px;
      }
      .group-now {
        margin: 0 8px;
      }
    }

    .action {
      margin-left: auto;
      display: flex;
      align-items: center;

      .rotate-z {
        transform: rotateZ(180deg);
      }
      &-expand {
        transition: all 0.2s;
      }
    }
  }

  .body {
    display: flex;
    flex-wrap: wrap;
    margin-top: 4px;
    .proxy {
      width: calc(20% - 8px);
      margin: 4px 4px;
      .delay {
        line-height: 1.8;
        height: 20px;
      }
      .type,
      .delay {
        font-size: 12px;
      }
    }
  }
}
</style>
