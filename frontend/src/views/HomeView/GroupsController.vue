<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from '@/hooks/useMessage'
import { useAppSettingsStore, useKernelApiStore } from '@/stores'
import { useProxy, getGroupDelay, getConnections, deleteConnection } from '@/api/kernel'
import { ignoredError, sleep } from '@/utils'
import { ProxyGroupType } from '@/constant/kernel'

const expandedSet = ref<Set<string>>(new Set())
const loadingSet = ref<Set<string>>(new Set())
const loading = ref(false)

const { t } = useI18n()
const { message } = useMessage()
const appSettings = useAppSettingsStore()
const kernelApiStore = useKernelApiStore()

const groups = computed(() => {
  if (!kernelApiStore.providers.default) return []
  const { proxies } = kernelApiStore
  return kernelApiStore.providers.default.proxies
    .concat([kernelApiStore.proxies.GLOBAL])
    .filter((v) => v.all)
    .map((provider) => {
      const all = provider.all
        .filter((v) => {
          return (
            appSettings.app.kernel.unAvailable ||
            ['DIRECT', 'REJECT'].includes(v) ||
            kernelApiStore.proxies[v].all ||
            kernelApiStore.proxies[v].alive
          )
        })
        .map((v) => {
          const delay = proxies[v].history[proxies[v].history.length - 1]?.delay
          return { ...proxies[v], delay }
        })

      const chains = [provider.now]
      let tmp = proxies[provider.now]
      while (tmp) {
        tmp.now && chains.push(tmp.now)
        tmp = proxies[tmp.now]
      }

      return { ...provider, all, chains }
    })
})

const handleUseProxy = async (group: any, proxy: any) => {
  if (group.type !== 'Selector') return

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
    await kernelApiStore.refreshProviderProxies()
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
    await kernelApiStore.refreshProviderProxies()
  } catch (error: any) {
    message.info(error)
  }
  loadingSet.value.delete(group)
}

const handleRefresh = async () => {
  loading.value = true
  await ignoredError(kernelApiStore.refreshCofig)
  await ignoredError(kernelApiStore.refreshProviderProxies)
  await sleep(500)
  loading.value = false
}

const locateGroup = (group: any, chain: string) => {
  collapseAll()
  if (kernelApiStore.proxies[chain].all) {
    toggleExpanded(kernelApiStore.proxies[chain].name)
  } else {
    toggleExpanded(group.name)
  }
}

const delayColor = (delay = 0) => {
  if (delay === 0) return '#f00'
  if (delay < 100) return '#6ec96e'
  if (delay < 200) return '#d98506'
  if (delay < 500) return '#d4451a'
  return '#bc1212'
}
</script>

<template>
  <div class="groups">
    <div class="header">
      <Switch v-model="appSettings.app.kernel.autoClose">
        {{ t('home.controller.autoClose') }}
      </Switch>
      <Switch v-model="appSettings.app.kernel.unAvailable" style="margin-left: 8px">
        {{ t('home.controller.unAvailable') }}
      </Switch>
      <Button @click="expandAll" type="text" style="margin-left: auto">
        <Icon icon="expand" />
      </Button>
      <Button @click="collapseAll" type="text">
        <Icon icon="collapse" />
      </Button>
      <Button @click="handleRefresh" :loading="loading" type="text">
        <Icon icon="refresh" />
      </Button>
    </div>
  </div>
  <div v-for="group in groups" :key="group.name" class="groups">
    <div class="header">
      <div class="group-info">
        <span class="group-name">{{ group.name }}</span>
        <span class="group-type">
          {{
            t(
              {
                [ProxyGroupType.Selector]: 'kernel.proxyGroups.type.Selector',
                [ProxyGroupType.UrlTest]: 'kernel.proxyGroups.type.UrlTest',
                [ProxyGroupType.Fallback]: 'kernel.proxyGroups.type.Fallback',
                [ProxyGroupType.Relay]: 'kernel.proxyGroups.type.Relay',
                [ProxyGroupType.LoadBalance]: 'kernel.proxyGroups.type.LoadBalance'
              }[group.type]!
            )
          }}
        </span>
        <span> :: </span>
        <template v-for="(chain, index) in group.chains" :key="chain">
          <span v-if="index !== 0" style="color: gray"> / </span>
          <Button @click="locateGroup(group, chain)" type="text" size="small">{{ chain }}</Button>
        </template>
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
        <div class="type">{{ proxy.type }} {{ proxy.udp ? ':: udp' : '' }}</div>
      </Card>
    </div>
  </div>
</template>

<style lang="less" scoped>
.groups {
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
    }

    .action {
      margin-left: auto;

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