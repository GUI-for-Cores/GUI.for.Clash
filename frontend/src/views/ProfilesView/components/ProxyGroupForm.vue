<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'

import { GroupsTypeOptions, StrategyOptions, BuiltInOutbound } from '@/constant/kernel'
import { ProxyGroup } from '@/enums/kernel'
import { useSubscribesStore } from '@/stores'

type GroupsType = App.Profile['proxyGroupsConfig']

interface Props {
  group: GroupsType[number]
  groups: GroupsType
}

const props = defineProps<Props>()
const { group } = toRefs(props)

const { t } = useI18n()
const subscribesStore = useSubscribesStore()
const expandedSet = ref<Set<string>>(new Set(['Built-In', 'Subscribes']))

const proxyGroups = [
  {
    id: 'Built-In',
    name: 'kernel.proxyGroups.builtIn',
    proxies: [
      ...BuiltInOutbound.map((v) => ({ id: v, name: v, type: 'Built-In' })),
      ...props.groups.map(({ id, name, type }) => ({ id, name, type })),
    ],
  },
  {
    id: 'Subscribes',
    name: 'kernel.proxyGroups.subscriptions',
    proxies: subscribesStore.subscribes.map(({ id, name }) => ({ id, name, type: 'use' })),
  },
  ...subscribesStore.subscribes.map(({ id, name, proxies }) => ({ id, name, proxies })),
]

const isSupportInverval = computed(() =>
  ([ProxyGroup.UrlTest, ProxyGroup.Fallback, ProxyGroup.LoadBalance] as App.ProxyGroup[]).includes(
    group.value.type,
  ),
)

const handleAddProxy = (groupID: string, proxyID: string, proxyName: string) => {
  if (groupID === 'Built-In' && proxyID === group.value.id) return

  if (groupID === 'Subscribes') {
    const idx = group.value.use.findIndex((v) => v === proxyID)
    if (idx !== -1) {
      group.value.use.splice(idx, 1)
    } else {
      group.value.use.push(proxyID)
    }
    return
  }

  const idx = group.value.proxies.findIndex((v) => v.id === proxyID)
  if (idx !== -1) {
    group.value.proxies.splice(idx, 1)
  } else {
    group.value.proxies.push({ id: proxyID, type: groupID, name: proxyName })
  }
}

const isInuse = (groupID: string, proxyID: string) => {
  if (groupID === 'Subscribes') {
    return group.value.use.includes(proxyID)
  }
  return group.value.proxies.some((v) => v.id === proxyID)
}

const toggleExpanded = (key: string) => {
  if (expandedSet.value.has(key)) {
    expandedSet.value.delete(key)
  } else {
    expandedSet.value.add(key)
  }
}

const isExpanded = (key: string) => expandedSet.value.has(key)
</script>

<template>
  <div class="form-item">
    {{ t('kernel.proxyGroups.name') }}
    <Input v-model="group.name" autofocus />
  </div>
  <div class="form-item">
    {{ t('kernel.proxyGroups.type.name') }}
    <Radio v-model="group.type" :options="GroupsTypeOptions" />
  </div>
  <div class="form-item">
    {{ t('kernel.proxyGroups.hidden') }}
    <Switch v-model="group.hidden" />
  </div>
  <div class="form-item">
    {{ t('kernel.proxyGroups.filter') }}
    <Input v-model="group.filter" placeholder="keyword1|keyword2" />
  </div>
  <div class="form-item">
    {{ t('kernel.proxyGroups.exclude-filter') }}
    <Input v-model="group['exclude-filter']" placeholder="keyword1|keyword2" />
  </div>
  <div class="form-item">
    <div class="flex items-center gap-8">
      {{ t('kernel.proxyGroups.icon') }}
      <img v-if="group.icon" :src="group.icon" class="w-18 h-18" />
    </div>
    <Input v-model="group.icon" clearable placeholder="https://" />
  </div>
  <div class="form-item">
    {{ t('kernel.proxyGroups.disable-udp') }}
    <Switch v-model="group['disable-udp']" />
  </div>
  <template v-if="isSupportInverval">
    <div class="form-item">
      {{ t('kernel.proxyGroups.lazy') }}
      <Switch v-model="group.lazy" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.interval') }}
      <Input v-model="group.interval" type="number" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.url') }}
      <Input v-model="group.url" />
    </div>
  </template>
  <div v-show="group.type === ProxyGroup.UrlTest" class="form-item">
    {{ t('kernel.proxyGroups.tolerance') }}
    <Input v-model="group.tolerance" type="number" />
  </div>
  <div v-show="group.type === ProxyGroup.LoadBalance" class="form-item">
    {{ t('kernel.proxyGroups.strategy.name') }}
    <Radio v-model="group.strategy" :options="StrategyOptions" />
  </div>

  <Divider> {{ t('profile.use') }} & {{ t('profile.proxies') }} </Divider>

  <div v-for="proxyGroup in proxyGroups" :key="proxyGroup.id">
    <Button
      :type="isExpanded(proxyGroup.id) ? 'link' : 'text'"
      class="sticky top-0 backdrop-blur-sm w-full"
      @click="toggleExpanded(proxyGroup.id)"
    >
      {{ t(proxyGroup.name) }}
      <div class="ml-auto mr-8">{{ proxyGroup.proxies.length }}</div>
      <Icon
        :class="{ 'rotate-z': isExpanded(proxyGroup.id) }"
        icon="arrowRight"
        class="action-expand"
      />
    </Button>
    <div v-show="isExpanded(proxyGroup.id)">
      <Empty
        v-if="proxyGroup.proxies.length === 0"
        :description="
          proxyGroup.id === 'Subscribes'
            ? t('kernel.proxyGroups.noSubs')
            : t('kernel.proxyGroups.empty')
        "
      />
      <div v-else class="w-full grid grid-cols-4 gap-8 p-8">
        <Button
          v-for="proxy in proxyGroup.proxies"
          :key="proxy.id"
          :type="isInuse(proxyGroup.id, proxy.id) ? 'link' : 'text'"
          @click="handleAddProxy(proxyGroup.id, proxy.id, proxy.name)"
        >
          {{ proxy.name }}
          <br />
          {{ proxy.type }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.action-expand {
  transition: all 0.2s;
}
.rotate-z {
  transform: rotateZ(90deg);
}
</style>
