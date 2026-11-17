<script setup lang="ts">
import { ref, computed, watch, onActivated } from 'vue'
import { useI18n } from 'vue-i18n'
import { parse } from 'yaml'

import { getProxyDelay, deleteGroupFixed } from '@/api/kernel'
import { HttpCancel, ReadFile } from '@/bridge'
import {
  ControllerCloseModeOptions,
  DefaultCardColumns,
  DefaultConcurrencyLimit,
  DefaultControllerSensitivity,
  DefaultTestTimeout,
  DefaultTestURL,
} from '@/constant/app'
import { BuiltInOutbound, CoreConfigFilePath } from '@/constant/kernel'
import { ControllerCloseMode } from '@/enums/app'
import { ProxyGroupType } from '@/enums/kernel'
import { useBool } from '@/hooks'
import {
  useAppSettingsStore,
  useKernelApiStore,
  useProfilesStore,
  useSubscribesStore,
} from '@/stores'
import {
  ignoredError,
  sleep,
  handleUseProxy,
  message,
  createAsyncPool,
  buildSmartRegExp,
  sampleID,
} from '@/utils'

const expandedSet = ref<Set<string>>(new Set())
const loadingSet = ref<Set<string>>(new Set())
const filterKeywordsMap = ref<Record<string, string>>({})

const loading = ref(false)

const { t } = useI18n()
const [showMoreSettings, toggleMoreSettings] = useBool(false)
const appSettings = useAppSettingsStore()
const kernelApiStore = useKernelApiStore()
const profilesStore = useProfilesStore()
const subscribesStore = useSubscribesStore()

type ProxyServerFields = { server?: unknown; port?: unknown }

const proxyEndpoints = ref<Record<string, ProxyServerFields>>({})

const cardMode = computed({
  get: () => appSettings.app.kernel.cardMode && !appSettings.app.kernel.listMode,
  set: (value: boolean) => {
    appSettings.app.kernel.cardMode = value
    if (value) appSettings.app.kernel.listMode = false
  },
})

const listMode = computed({
  get: () => !!appSettings.app.kernel.listMode,
  set: (value: boolean) => {
    appSettings.app.kernel.listMode = value
    if (value) appSettings.app.kernel.cardMode = false
  },
})

const formatProxyServer = (proxy?: ProxyServerFields | null) => {
  if (!proxy || typeof proxy.server !== 'string') return ''
  const server = proxy.server.trim()
  if (!server) return ''
  const portValue = proxy.port
  if (typeof portValue !== 'number' && typeof portValue !== 'string') return server
  const portText = String(portValue).trim()
  if (!/^\d+$/.test(portText)) return server
  const host = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server
  return `${host}:${portText}`
}

const proxyServerText = (proxy: ProxyServerFields & { name: string; all?: unknown }) => {
  if (proxy.all) return ''
  return formatProxyServer(proxyEndpoints.value[proxy.name]) || formatProxyServer(proxy)
}

const proxyListFromDocument = (document: unknown) => {
  if (Array.isArray(document)) return document
  if (document && typeof document === 'object' && 'proxies' in document) {
    return (document as { proxies?: unknown }).proxies
  }
  return undefined
}

const assignProxyServers = (map: Record<string, ProxyServerFields>, list: unknown) => {
  if (!Array.isArray(list)) return
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const proxy = item as { name?: unknown; server?: unknown; port?: unknown }
    if (typeof proxy.name !== 'string' || !proxy.name) continue
    if (typeof proxy.server !== 'string' || !proxy.server.trim()) continue
    map[proxy.name] = { server: proxy.server, port: proxy.port }
  }
}

const resolveProviderPath = (providerPath: string) => {
  if (providerPath.startsWith('../')) return `data/${providerPath.slice(3)}`
  return providerPath
}

let endpointLoadId = 0

// Addresses live on the proxy config (subscription files and the generated core
// config). The runtime proxy API does not include `server`.
const loadProxyEndpoints = async () => {
  const id = ++endpointLoadId
  const map: Record<string, ProxyServerFields> = {}
  const profile = profilesStore.currentProfile
  const subIds = new Set<string>()
  if (profile) {
    for (const group of profile.proxyGroupsConfig) {
      group.use.forEach((use) => subIds.add(use))
      group.proxies.forEach((proxy) => {
        if (proxy.type !== 'Built-In') subIds.add(proxy.type)
      })
    }
  }
  const subs = subIds.size
    ? subscribesStore.subscribes.filter((sub) => subIds.has(sub.id))
    : subscribesStore.subscribes
  const paths = new Set(subs.map((sub) => sub.path).filter(Boolean))

  let config: {
    proxies?: unknown
    'proxy-providers'?: Record<string, { type?: string; path?: string; payload?: unknown }>
  } | null = null
  try {
    config = parse(await ReadFile(CoreConfigFilePath))
  } catch {
    config = null
  }

  const providers = config?.['proxy-providers']
  if (providers && typeof providers === 'object') {
    for (const provider of Object.values(providers)) {
      if (provider?.type === 'file' && provider.path) {
        paths.add(resolveProviderPath(provider.path))
      }
    }
  }

  const documents = await Promise.all(
    [...paths].map(async (path) => {
      try {
        return parse(await ReadFile(path)) as unknown
      } catch {
        return undefined
      }
    }),
  )
  documents.forEach((document) => assignProxyServers(map, proxyListFromDocument(document)))

  if (providers && typeof providers === 'object') {
    for (const provider of Object.values(providers)) {
      if (provider?.type === 'inline') assignProxyServers(map, provider.payload)
    }
  }
  assignProxyServers(map, config?.proxies)

  if (id !== endpointLoadId) return
  proxyEndpoints.value = map
}

const groups = computed(() => {
  const { proxies } = kernelApiStore
  return Object.values(proxies)
    .filter((v) => {
      if (v.hidden || v.name === 'GLOBAL') return false
      return [
        ProxyGroupType.Selector,
        ProxyGroupType.UrlTest,
        ProxyGroupType.Fallback,
        ProxyGroupType.LoadBalance,
      ].includes(v.type as ProxyGroupType)
    })
    .sort((a, b) => {
      const aIndex = proxies.GLOBAL?.all.indexOf(a.name) || 0
      const bIndex = proxies.GLOBAL?.all.indexOf(b.name) || 0
      return aIndex - bIndex
    })
    .concat(proxies.GLOBAL || [])
    .map((group) => {
      const all = (group.all || [])
        .filter((proxy) => {
          const history = proxies[proxy]?.history || []
          const alive = (history[history.length - 1]?.delay ?? 0) > 0
          const condition1 =
            appSettings.app.kernel.unAvailable ||
            BuiltInOutbound.includes(proxy) ||
            proxies[proxy]?.all ||
            alive
          const keywords = filterKeywordsMap.value[group.name]
          const condition2 = keywords ? buildSmartRegExp(keywords, 'i').test(proxy) : true
          return condition1 && condition2
        })
        .map((proxy) => {
          const history = proxies[proxy]?.history || []
          const delay = history[history.length - 1]?.delay || 0
          return { ...proxies[proxy]!, delay }
        })
        .sort((a, b) => {
          if (!appSettings.app.kernel.sortByDelay || a.delay === b.delay) return 0
          if (!a.delay) return 1
          if (!b.delay) return -1
          return a.delay - b.delay
        })

      const chains = [group.now]
      let tmp = proxies[group.now]
      while (tmp) {
        tmp.now && chains.push(tmp.now)
        tmp = proxies[tmp.now]
      }

      return { ...group, all, chains }
    })
})

const useProxyWithCatchError = (group: any, proxy: any) => {
  handleUseProxy(group, proxy).catch((err: any) => message.error(err.message || err))
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

const isFiltered = (group: string) => filterKeywordsMap.value[group]

const handleGroupDelay = async (group: string) => {
  const _group = kernelApiStore.proxies[group]
  if (_group) {
    let index = 0
    let success = 0
    let failure = 0
    let cancelled = false
    const pendingRequests = new Set<string>()

    const delayTest = async (name: string) => {
      index += 1
      update(`Testing... ${index} / ${_group.all.length}, success: ${success} failure: ${failure}`)
      const proxy = kernelApiStore.proxies[name]
      const cancelId = sampleID()
      pendingRequests.add(cancelId)
      try {
        loadingSet.value.add(name)
        const { delay = 0 } = await getProxyDelay(
          encodeURIComponent(proxy?.provider || ''),
          encodeURIComponent(name),
          appSettings.app.kernel.testUrl || DefaultTestURL,
          appSettings.app.kernel.testTimeout || DefaultTestTimeout,
          cancelId,
        )
        success += 1
        proxy && proxy.history.push({ delay })
      } catch {
        if (!cancelled) {
          failure += 1
          proxy && proxy.history.push({ delay: 0 })
        }
      }
      pendingRequests.delete(cancelId)
      update(`Testing... ${index} / ${_group.all.length}, success: ${success} failure: ${failure}`)
      loadingSet.value.delete(name)
    }

    loadingSet.value.add(group)
    const { run, controller } = createAsyncPool(
      appSettings.app.kernel.concurrencyLimit || DefaultConcurrencyLimit,
      _group.all,
      delayTest,
    )
    const {
      update,
      destroy,
      success: msgSuccess,
    } = message.info('Testing...', 99999, () => {
      cancelled = true
      controller.cancel()
      pendingRequests.forEach((id) => HttpCancel(id))
      message.warn('common.canceled')
    })
    await run()
    loadingSet.value.delete(group)
    msgSuccess(
      `Completed. ${index} / ${_group.all.length}, success: ${success} failure: ${failure}`,
    )
    await sleep(3000)
    destroy()
  }
}

const handleProxyDelay = async (name: string) => {
  loadingSet.value.add(name)
  try {
    const proxy = kernelApiStore.proxies[name]
    const { delay = 0 } = await getProxyDelay(
      encodeURIComponent(proxy?.provider || ''),
      encodeURIComponent(name),
      appSettings.app.kernel.testUrl || DefaultTestURL,
      appSettings.app.kernel.testTimeout || DefaultTestTimeout,
    )
    proxy && proxy.history.push({ delay })
  } catch (error: any) {
    message.error(error + ': ' + name)
  }
  loadingSet.value.delete(name)
}

const handleRefresh = async () => {
  loading.value = true
  await ignoredError(kernelApiStore.refreshConfig)
  await ignoredError(kernelApiStore.refreshProviderProxies)
  if (listMode.value) await ignoredError(loadProxyEndpoints)
  await sleep(100)
  loading.value = false
}

const locateGroup = (group: any, chain: string) => {
  collapseAll()
  if (kernelApiStore.proxies[chain]?.all) {
    toggleExpanded(kernelApiStore.proxies[chain].name)
  } else {
    toggleExpanded(group.name)
  }
}

const handleClearGroupFixed = async (group: string) => {
  await deleteGroupFixed(group)
  await ignoredError(kernelApiStore.refreshProviderProxies)
}

const delayColor = (delay = 0) => {
  if (delay === 0) return 'var(--level-0-color)'
  if (delay < 200) return 'var(--level-1-color)'
  if (delay < 500) return 'var(--level-2-color)'
  if (delay < 1200) return 'var(--level-3-color)'
  return 'var(--level-4-color)'
}

const handleResetMoreSettings = () => {
  appSettings.app.kernel.testUrl = DefaultTestURL
  appSettings.app.kernel.testTimeout = DefaultTestTimeout
  appSettings.app.kernel.concurrencyLimit = DefaultConcurrencyLimit
  appSettings.app.kernel.controllerCloseMode = ControllerCloseMode.All
  appSettings.app.kernel.controllerSensitivity = DefaultControllerSensitivity
  appSettings.app.kernel.cardColumns = DefaultCardColumns
  message.success('common.success')
}

watch(
  [
    listMode,
    () => {
      const profile = profilesStore.currentProfile
      const subs = subscribesStore.subscribes
        .map((sub) => `${sub.id}:${sub.path}:${sub.updateTime}`)
        .join('|')
      return `${profile?.id || ''}:${subs}:${Object.keys(kernelApiStore.proxies).join('|')}`
    },
  ],
  ([enabled]) => {
    if (enabled) loadProxyEndpoints()
  },
  { immediate: true },
)

onActivated(() => {
  kernelApiStore.refreshProviderProxies()
  if (listMode.value) loadProxyEndpoints()
})
</script>

<template>
  <div class="m-8 mt-0 sticky top-0 z-3">
    <div
      class="sticky flex gap-8 items-center p-8 rounded-8 backdrop-blur-sm"
      style="background-color: var(--card-bg)"
    >
      <Switch v-model="appSettings.app.kernel.autoClose" label="home.controller.autoClose" />
      <Switch v-model="appSettings.app.kernel.unAvailable" label="home.controller.unAvailable" />
      <Switch v-model="cardMode" label="home.controller.cardMode" />
      <Switch v-model="listMode" label="home.controller.listMode" />
      <Switch v-model="appSettings.app.kernel.sortByDelay" label="home.controller.sortBy" />
      <Button type="primary" size="small" @click="toggleMoreSettings"> ... </Button>
      <div class="ml-auto flex items-center">
        <Button v-tips="'home.overview.expandAll'" type="text" icon="expand" @click="expandAll" />
        <Button
          v-tips="'home.overview.collapseAll'"
          type="text"
          icon="collapse"
          @click="collapseAll"
        />
        <Button
          v-tips="'home.overview.refresh'"
          :loading="loading"
          icon="refresh"
          type="text"
          @click="handleRefresh"
        />
      </div>
    </div>
  </div>
  <div v-for="group in groups" :key="group.name" class="m-8">
    <div
      class="sticky z-2 flex gap-8 items-center p-8 rounded-8 backdrop-blur-sm"
      style="top: 52px; background-color: var(--card-bg)"
      @click="toggleExpanded(group.name)"
    >
      <div class="text-14 flex items-center gap-2 text-nowrap overflow-hidden">
        <img v-if="group.icon" :src="group.icon" class="w-24 h-24 mr-4" draggable="false" />
        <span class="font-bold text-18">{{ group.name }}</span>
        <span class="mx-8">
          {{ group.type }}
        </span>
        <span> :: </span>
        <template v-for="(chain, index) in group.chains" :key="chain">
          <span v-if="index !== 0" style="color: gray"> / </span>
          <Button type="text" size="small" @click.stop="locateGroup(group, chain)">
            {{ chain }}
          </Button>
        </template>
        <Button
          v-if="group.fixed"
          type="text"
          size="small"
          icon="clear"
          @click.stop="handleClearGroupFixed(group.name)"
        />
      </div>
      <div class="ml-auto flex items-center" @click.stop>
        <Input
          v-model="filterKeywordsMap[group.name]"
          :placeholder="t('common.keywords')"
          editable
          clearable
        >
          <template #editable>
            <Button
              type="text"
              icon="filter"
              :icon-color="isFiltered(group.name) ? 'var(--primary-color)' : ''"
            />
          </template>
        </Input>
        <Button
          v-tips="'home.overview.delayTest'"
          :loading="isLoading(group.name)"
          type="text"
          icon="speedTest"
          @click="handleGroupDelay(group.name)"
        />
        <Button type="text" @click="toggleExpanded(group.name)">
          <Icon
            :class="{ 'action-expand-expanded': isExpanded(group.name) }"
            class="action-expand origin-center duration-200"
            icon="arrowDown"
          />
        </Button>
      </div>
    </div>
    <Transition name="expand">
      <div v-if="isExpanded(group.name)" class="py-8 px-4">
        <Empty v-if="group.all.length === 0" />
        <div v-else-if="listMode" class="proxy-list">
          <div class="proxy-list-head text-12">
            <span class="proxy-col-selected">{{ t('home.controller.columns.selected') }}</span>
            <span>{{ t('home.controller.columns.name') }}</span>
            <span>{{ t('home.controller.columns.type') }}</span>
            <span>{{ t('home.controller.columns.server') }}</span>
            <span class="proxy-col-delay">{{ t('home.controller.columns.delay') }}</span>
          </div>
          <div
            v-for="proxy in group.all"
            :key="proxy.name"
            :class="{ selected: proxy.name === group.now }"
            class="proxy-row cursor-pointer"
            @click="useProxyWithCatchError(group, proxy)"
          >
            <span class="proxy-col-selected">
              <Icon
                v-if="proxy.name === group.now"
                :size="18"
                icon="selected"
                color="var(--primary-color)"
              />
            </span>
            <span v-tips="proxy.name" class="proxy-col-name text-14 font-bold">
              {{ proxy.name }}
            </span>
            <span class="proxy-col-type text-12">
              {{ proxy.type }}<template v-if="proxy.udp"> :: udp</template>
            </span>
            <span
              v-tips="proxyServerText(proxy)"
              class="proxy-col-server text-12"
              :style="proxyServerText(proxy) ? undefined : { color: 'gray' }"
            >
              {{ proxyServerText(proxy) || '--' }}
            </span>
            <span class="proxy-col-delay" @click.stop>
              <Button
                :style="{ color: delayColor(proxy.delay) }"
                :loading="isLoading(proxy.name)"
                type="text"
                size="small"
                @click.stop="handleProxyDelay(proxy.name)"
              >
                <div class="text-12">
                  {{ proxy.delay ? proxy.delay + 'ms' : '--' }}
                </div>
              </Button>
            </span>
          </div>
        </div>
        <div
          v-else-if="cardMode"
          :class="`grid-cols-${appSettings.app.kernel.cardColumns}`"
          class="grid gap-8"
        >
          <Card
            v-for="proxy in group.all"
            :key="proxy.name"
            :title="proxy.name"
            :selected="proxy.name === group.now"
            class="cursor-pointer"
            @click="useProxyWithCatchError(group, proxy)"
          >
            <Button
              :style="{ color: delayColor(proxy.delay) }"
              :loading="isLoading(proxy.name)"
              type="text"
              size="small"
              style="margin-left: -2px; padding-left: 2px"
              @click.stop="handleProxyDelay(proxy.name)"
            >
              <div class="text-12">
                {{ proxy.delay && proxy.delay + 'ms' }}
              </div>
            </Button>
            <div class="text-12 my-2">{{ proxy.type }} {{ proxy.udp ? ':: udp' : '' }}</div>
          </Card>
        </div>
        <div v-else class="grid grid-cols-32 gap-8">
          <div
            v-for="proxy in group.all"
            :key="proxy.name"
            v-tips.fast="proxy.name"
            :style="{ background: delayColor(proxy.delay) }"
            :class="proxy.name === group.now ? 'rounded-full shadow' : ''"
            class="w-12 h-12 rounded-4 flex items-center justify-center"
            @click="useProxyWithCatchError(group, proxy)"
          >
            <Icon v-if="isLoading(proxy.name)" icon="loading" :size="12" class="rotation" />
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <Modal
    v-model:open="showMoreSettings"
    :submit="false"
    mask-closable
    cancel-text="common.close"
    title="common.more"
  >
    <template #action>
      <Button type="text" class="mr-auto" @click="handleResetMoreSettings">
        {{ t('common.reset') }}
      </Button>
    </template>

    <div class="form-item">
      {{ t('home.controller.delay') }}
      <Input
        v-model="appSettings.app.kernel.testUrl"
        :placeholder="DefaultTestURL"
        editable
        clearable
      />
    </div>

    <div class="form-item">
      {{ t('home.controller.timeout') }}
      <Input
        v-model="appSettings.app.kernel.testTimeout"
        :placeholder="String(DefaultTestTimeout)"
        type="number"
        editable
        clearable
      />
    </div>

    <div class="form-item">
      {{ t('home.controller.concurrencyLimit') }}
      <Input
        v-model="appSettings.app.kernel.concurrencyLimit"
        :min="1"
        :max="50"
        type="number"
        editable
        clearable
      />
    </div>

    <div class="form-item">
      {{ t('home.controller.closeMode.name') }}
      <Radio
        v-model="appSettings.app.kernel.controllerCloseMode"
        :options="ControllerCloseModeOptions"
      />
    </div>

    <div
      v-if="appSettings.app.kernel.controllerCloseMode === ControllerCloseMode.All"
      class="form-item"
    >
      {{ t('home.controller.sensitivity') }}
      <Input
        v-model="appSettings.app.kernel.controllerSensitivity"
        type="number"
        :min="1"
        :max="6"
        placeholder="1-6"
        editable
      />
    </div>

    <div class="form-item">
      {{ t('home.controller.cardColumns') }}
      <Radio
        v-model="appSettings.app.kernel.cardColumns"
        :options="Array.from({ length: 5 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))"
      />
    </div>
  </Modal>
</template>

<style lang="less" scoped>
.expand-enter-active,
.expand-leave-active {
  transform-origin: top;
  transition:
    transform 0.2s ease-in-out,
    opacity 0.2s ease-in-out;
}

.expand-enter-from,
.expand-leave-to {
  transform: scaleY(0);
}

.action-expand {
  transform: rotate(-90deg);
  &-expanded {
    transform: rotate(0deg);
  }
}

.proxy-list {
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) max-content minmax(0, 1fr) max-content;
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
}

.proxy-list-head,
.proxy-row {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  align-items: center;
  column-gap: 12px;
  padding: 4px 12px;
}

.proxy-list-head {
  color: gray;
  padding-bottom: 0;
}

.proxy-row {
  min-height: 36px;
  color: var(--card-color);
  background-color: var(--card-bg);
  border-radius: 8px;
  transition:
    box-shadow 0.2s,
    background 0.2s;

  &:hover {
    box-shadow: 0 8px 8px rgba(0, 0, 0, 0.06);
    background-color: var(--card-hover-bg);
  }

  &:active {
    background-color: var(--card-active-bg);
  }

  &.selected {
    box-shadow: inset 3px 0 0 var(--primary-color);
  }

  &.selected:hover {
    box-shadow:
      inset 3px 0 0 var(--primary-color),
      0 8px 8px rgba(0, 0, 0, 0.06);
  }
}

.proxy-col-name,
.proxy-col-type,
.proxy-col-server {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.proxy-col-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
}

.proxy-col-delay {
  justify-self: end;
}
</style>
