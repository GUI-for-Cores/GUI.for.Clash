<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { GroupsTypeOptions, StrategyOptions, DraggableOptions, BuiltInOutbound } from '@/constant'
import { ProxyGroup } from '@/enums/kernel'
import { type ProfileType, useSubscribesStore } from '@/stores'
import { deepClone, sampleID, message } from '@/utils'

type GroupsType = ProfileType['proxyGroupsConfig']

const groups = defineModel<GroupsType>({ default: [] })

let updateGroupId = 0
const showModal = ref(false)
const showSortModal = ref(false)
const expandedSet = ref<Set<string>>(new Set(['Built-In', 'Subscribes']))
const SubscribesNameMap = ref<Record<string, string>>({})

const proxyGroup = ref([
  {
    id: 'Built-In',
    name: 'kernel.proxyGroups.builtIn',
    proxies: [
      ...BuiltInOutbound.map((v) => ({ id: v, name: v, type: 'Built-In' })),
      ...groups.value.map(({ id, name, type }) => ({ id, name, type })),
    ],
  },
  {
    id: 'Subscribes',
    name: 'kernel.proxyGroups.subscriptions',
    proxies: [],
  },
])

const fields = ref<GroupsType[number]>({
  id: sampleID(),
  name: '',
  type: ProxyGroup.Select,
  proxies: [],
  url: '',
  interval: 0,
  strategy: '',
  use: [],
  tolerance: 0,
  lazy: true,
  'disable-udp': false,
  filter: '',
  'exclude-filter': '',
  hidden: false,
  icon: '',
})

const { t } = useI18n()
const subscribesStore = useSubscribesStore()

const handleAdd = () => {
  updateGroupId = -1
  fields.value = {
    id: sampleID(),
    name: '',
    type: ProxyGroup.Select,
    proxies: [],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: '',
    'exclude-filter': '',
    hidden: false,
    icon: '',
  }
  showModal.value = true
}

defineExpose({ handleAdd })

const handleDeleteGroup = (index: number) => {
  const name = groups.value[index]!.name
  groups.value.splice(index, 1)
  proxyGroup.value = proxyGroup.value.map((v) => ({
    ...v,
    proxies: v.proxies.filter((v) => v.name !== name),
  }))
}

const handleClearGroup = async (g: GroupsType[0]) => {
  g.proxies = g.proxies.filter(({ type, name, id }) => {
    if (type === 'Built-In') {
      if (BuiltInOutbound.includes(name)) {
        return true
      }
      return groups.value.some((v) => v.id === id)
    }
    const sub = subscribesStore.getSubscribeById(type)
    if (!sub) return false
    return sub.proxies.some((v) => v.id === id)
  })

  g.use = g.use.filter((v) => subscribesStore.subscribes.some(({ id }) => id === v))
}

const handleEditGroup = (index: number) => {
  updateGroupId = index
  fields.value = deepClone(groups.value[index]!)
  showModal.value = true
}

const handleAddProxy = (groupID: string, proxyID: string, proxyName: string) => {
  // self
  if (groupID === 'Built-In' && proxyID === fields.value.id) return

  // subscribes
  if (groupID === 'Subscribes') {
    const idx = fields.value.use.findIndex((v) => v === proxyID)
    if (idx !== -1) {
      fields.value.use.splice(idx, 1)
    } else {
      fields.value.use.push(proxyID)
    }
    return
  }

  // proxy
  const idx = fields.value.proxies.findIndex((v) => v.id === proxyID)
  if (idx !== -1) {
    fields.value.proxies.splice(idx, 1)
  } else {
    fields.value.proxies.push({ id: proxyID, type: groupID, name: proxyName })
  }
}

const handleAddEnd = () => {
  const { id, name, type } = fields.value
  // Add
  if (updateGroupId === -1) {
    groups.value.unshift(fields.value)
    proxyGroup.value[0]!.proxies.unshift({ id, name, type })
    return
  }
  // Update
  groups.value[updateGroupId] = fields.value
  const idx = proxyGroup.value[0]!.proxies.findIndex((v) => v.id === id)
  if (idx !== -1) {
    proxyGroup.value[0]!.proxies.splice(idx, 1, { id, name, type })
    groups.value.forEach((group) => {
      const proxy = group.proxies.find((proxy) => proxy.id === id)
      proxy && (proxy.name = name)
    })
  }
}

const isInuse = (groupID: string, proxyID: string) => {
  if (groupID === 'Subscribes') {
    return fields.value.use.includes(proxyID)
  }
  return fields.value.proxies.find((v) => v.id === proxyID)
}

const isSupportInverval = computed(() =>
  [ProxyGroup.UrlTest, ProxyGroup.Fallback, ProxyGroup.LoadBalance].includes(fields.value.type),
)

const hasLost = (g: GroupsType[0]) => {
  const isProxiesLost = g.proxies.some(({ type, id }) => {
    if (type === 'Built-In') {
      if (BuiltInOutbound.includes(id)) {
        return false
      }
      return groups.value.every((v) => v.id !== id)
    }

    const sub = subscribesStore.getSubscribeById(type)
    if (!sub) return true
    return sub.proxies.every((v) => v.id !== id)
  })

  const isUseLost = g.use.some((v) => {
    return subscribesStore.subscribes.every(({ id }) => id !== v)
  })

  return isProxiesLost || isUseLost
}

const handleSortGroup = (index: number) => {
  updateGroupId = index
  fields.value = deepClone(groups.value[index]!)
  showSortModal.value = true
}

const handleSortGroupEnd = () => {
  groups.value[updateGroupId] = fields.value
}

const needToAdd = (g: GroupsType[0]) => g.use.length === 0 && g.proxies.length === 0

const toggleExpanded = (key: string) => {
  if (expandedSet.value.has(key)) {
    expandedSet.value.delete(key)
  } else {
    expandedSet.value.add(key)
  }
}

const isExpanded = (key: string) => expandedSet.value.has(key)

const showLost = () => message.warn('kernel.proxyGroups.notFound')

const showNeedToAdd = () => message.error('kernel.proxyGroups.needToAdd')

subscribesStore.subscribes.forEach(async ({ id, name, proxies }) => {
  proxyGroup.value[1]!.proxies.push({ id, name, type: 'use' })
  proxyGroup.value.push({ id, name, proxies })
  SubscribesNameMap.value[id] = name
})
</script>

<template>
  <div v-draggable="[groups, DraggableOptions]">
    <Card v-for="(g, index) in groups" :key="g.id" class="mb-2">
      <div class="flex items-center py-2">
        <div class="font-bold flex items-center">
          <img v-if="g.icon" :src="g.icon" class="w-18 h-18 mr-4" />
          <span v-if="hasLost(g)" @click="showLost" class="warn cursor-pointer"> [ ! ] </span>
          <span v-if="needToAdd(g)" @click="showNeedToAdd" class="error cursor-pointer">
            [ ! ]
          </span>
          {{ g.name }}
        </div>
        <Button @click="handleSortGroup(index)" type="link" size="small">
          (
          {{ t('profile.use') }}: {{ g.use.length }}
          /
          {{ t('profile.proxies') }}: {{ g.proxies.length }}
          )
        </Button>
        <div class="ml-auto">
          <Button @click="handleClearGroup(g)" v-if="hasLost(g)" type="text" size="small">
            {{ t('common.clear') }}
          </Button>
          <Button @click="handleEditGroup(index)" icon="edit" type="text" size="small" />
          <Button @click="handleDeleteGroup(index)" icon="delete" type="text" size="small" />
        </div>
      </div>
    </Card>
  </div>

  <Modal
    v-model:open="showSortModal"
    :on-ok="handleSortGroupEnd"
    mask-closable
    title="kernel.proxyGroups.sort"
    max-width="80"
    max-height="80"
  >
    <Divider>{{ t('profile.use') }}</Divider>
    <Empty v-if="fields.use.length === 0"></Empty>
    <div v-draggable="[fields.use, DraggableOptions]">
      <Button v-for="use in fields.use" :key="use" type="link" class="group-item">
        {{ SubscribesNameMap[use] || use }}
      </Button>
    </div>
    <Divider>{{ t('profile.proxies') }}</Divider>
    <Empty v-if="fields.proxies.length === 0"></Empty>
    <div v-draggable="[fields.proxies, DraggableOptions]">
      <Button v-for="proxy in fields.proxies" :key="proxy.id" type="link" class="group-item">
        {{ proxy.name }}
      </Button>
    </div>
  </Modal>

  <Modal
    v-model:open="showModal"
    :on-ok="handleAddEnd"
    title="profile.group"
    width="80"
    height="80"
  >
    <div class="form-item">
      {{ t('kernel.proxyGroups.name') }}
      <Input v-model="fields.name" autofocus />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.icon') }}
      <Input v-model="fields.icon" clearable />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.hidden') }}
      <Switch v-model="fields.hidden" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.filter') }}
      <Input v-model="fields.filter" placeholder="keyword1|keyword2" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.exclude-filter') }}
      <Input v-model="fields['exclude-filter']" placeholder="keyword1|keyword2" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.type.name') }}
      <Radio v-model="fields.type" :options="GroupsTypeOptions" />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.disable-udp') }}
      <Switch v-model="fields['disable-udp']" />
    </div>
    <template v-if="isSupportInverval">
      <div class="form-item">
        {{ t('kernel.proxyGroups.lazy') }}
        <Switch v-model="fields.lazy" />
      </div>
      <div class="form-item">
        {{ t('kernel.proxyGroups.interval') }}
        <Input v-model="fields.interval" type="number" />
      </div>
      <div class="form-item">
        {{ t('kernel.proxyGroups.url') }}
        <Input v-model="fields.url" />
      </div>
    </template>
    <div v-show="fields.type === ProxyGroup.UrlTest" class="form-item">
      {{ t('kernel.proxyGroups.tolerance') }}
      <Input v-model="fields.tolerance" type="number" />
    </div>
    <div v-show="fields.type === ProxyGroup.LoadBalance" class="form-item">
      {{ t('kernel.proxyGroups.strategy.name') }}
      <Radio v-model="fields.strategy" :options="StrategyOptions" />
    </div>

    <Divider> {{ t('profile.use') }} & {{ t('profile.proxies') }} </Divider>

    <div v-for="group in proxyGroup" :key="group.id">
      <Button
        :type="isExpanded(group.id) ? 'link' : 'text'"
        @click="toggleExpanded(group.id)"
        class="sticky top-0 backdrop-blur-sm w-full"
      >
        {{ t(group.name) }}
        <div class="ml-auto mr-8">{{ group.proxies.length }}</div>
        <Icon
          :class="{ 'rotate-z': isExpanded(group.id) }"
          icon="arrowRight"
          class="action-expand"
        />
      </Button>
      <div v-show="isExpanded(group.id)">
        <Empty
          v-if="group.proxies.length === 0"
          :description="
            group.id === 'Subscribes'
              ? t('kernel.proxyGroups.noSubs')
              : t('kernel.proxyGroups.empty')
          "
        />
        <template v-else>
          <div class="w-full grid grid-cols-4 gap-8 p-8">
            <Button
              v-for="proxy in group.proxies"
              :key="proxy.id"
              @click="handleAddProxy(group.id, proxy.id, proxy.name)"
              :type="isInuse(group.id, proxy.id) ? 'link' : 'text'"
            >
              {{ proxy.name }}
              <br />
              {{ proxy.type }}
            </Button>
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<style lang="less" scoped>
.warn {
  color: rgb(200, 193, 11);
}
.error {
  color: red;
}

.action-expand {
  transition: all 0.2s;
}
.rotate-z {
  transform: rotateZ(90deg);
}
</style>
