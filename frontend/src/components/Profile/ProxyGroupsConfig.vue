<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMessage } from '@/hooks'
import { deepClone, sampleID } from '@/utils'
import { type ProfileType, useSubscribesStore } from '@/stores'
import { GroupsTypeOptions, StrategyOptions, ProxyGroup } from '@/constant'

type GroupsType = ProfileType['proxyGroupsConfig']

interface Props {
  modelValue: GroupsType
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

const emits = defineEmits(['update:modelValue'])

let dragIndex = -1
let updateGroupId = 0
const showModal = ref(false)
const groups = ref(deepClone(props.modelValue))
const expandedSet = ref<Set<string>>(new Set(['Built-In', 'Subscribes']))

const proxyGroup = ref([
  {
    id: 'Built-In',
    name: 'Built-In',
    proxies: [
      { id: 'DIRECT', name: 'DIRECT', type: 'Built-In' },
      { id: 'REJECT', name: 'REJECT', type: 'Built-In' },
      ...groups.value.map(({ id, name, type }) => ({ id, name, type }))
    ]
  },
  {
    id: 'Subscribes',
    name: 'Subscribes',
    proxies: []
  }
])

const fields = ref<GroupsType[0]>({
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
  filter: ''
})

const { t } = useI18n()
const { message } = useMessage()
const subscribesStore = useSubscribesStore()

const handleAddGroup = () => {
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
    filter: ''
  }
  showModal.value = true
}

const handleDeleteGroup = (index: number) => {
  const name = groups.value[index].name
  groups.value.splice(index, 1)
  proxyGroup.value = proxyGroup.value.map((v) => ({
    ...v,
    proxies: v.proxies.filter((v) => v.name !== name)
  }))
}

const handleClearGroup = async (g: GroupsType[0]) => {
  g.proxies = g.proxies.filter(({ type, name, id }) => {
    if (type === 'Built-In') {
      if (['DIRECT', 'REJECT'].includes(name)) {
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
  fields.value = deepClone(groups.value[index])
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
    groups.value.push(fields.value)
    proxyGroup.value[0].proxies.push({ id, name, type })
    return
  }
  // Update
  groups.value[updateGroupId] = fields.value
  const idx = proxyGroup.value[0].proxies.findIndex((v) => v.id === id)
  if (idx !== -1) {
    proxyGroup.value[0].proxies.splice(idx, 1, { id, name, type })
  }
}

const isInuse = (groupID: string, proxyID: string) => {
  if (groupID === 'Subscribes') {
    return fields.value.use.includes(proxyID)
  }
  return fields.value.proxies.find((v) => v.id === proxyID)
}

const isSupportInverval = computed(() =>
  [ProxyGroup.UrlTest, ProxyGroup.Fallback, ProxyGroup.LoadBalance].includes(fields.value.type)
)

const hasLost = (g: GroupsType[0]) => {
  const isProxiesLost = g.proxies.some(({ type, id }) => {
    if (type === 'Built-In') {
      if (['DIRECT', 'REJECT'].includes(id)) {
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

const needToAdd = (g: GroupsType[0]) => g.use.length === 0 && g.proxies.length === 0

const toggleExpanded = (key: string) => {
  if (expandedSet.value.has(key)) {
    expandedSet.value.delete(key)
  } else {
    expandedSet.value.add(key)
  }
}

const isExpanded = (key: string) => expandedSet.value.has(key)

const showLost = () => message.info(t('kernel.proxyGroups.notFound'))

const showNeedToAdd = () => message.info(t('kernel.proxyGroups.needToAdd'))

const onDragStart = (e: any, index: number) => {
  dragIndex = index
}

const onDragEnter = (e: any, index: number) => {
  e.preventDefault()
  if (dragIndex !== index) {
    const source = groups.value[dragIndex]
    groups.value.splice(dragIndex, 1)
    groups.value.splice(index, 0, source)
    dragIndex = index
  }
}

const onDragOver = (e: any) => e.preventDefault()

watch(groups, (v) => emits('update:modelValue', v), { immediate: true, deep: true })

subscribesStore.subscribes.forEach(async ({ id, name, proxies }) => {
  proxyGroup.value[1].proxies.push({ id, name, type: 'use' })
  proxyGroup.value.push({ id, name, proxies })
})
</script>

<template>
  <TransitionGroup name="drag" tag="div">
    <Card
      v-for="(g, index) in groups"
      :key="g.id"
      @dragenter="onDragEnter($event, index)"
      @dragover="onDragOver($event)"
      @dragstart="onDragStart($event, index)"
      class="groups-item"
      draggable="true"
    >
      <div class="name">
        <span v-if="hasLost(g)" @click="showLost" class="warn"> [ ! ] </span>
        <span v-if="needToAdd(g)" @click="showNeedToAdd" class="warn"> [ ! ] </span>
        {{ g.name }}
      </div>
      <div class="count">
        <Button type="link" size="small">
          (
          {{ t('profile.use') }}:{{ g.use.length }}
          /
          {{ t('profile.proxies') }}:{{ g.proxies.length }}
          )
        </Button>
      </div>
      <div class="action">
        <Button @click="handleClearGroup(g)" v-if="hasLost(g)" type="text">
          {{ t('common.clear') }}
        </Button>
        <Button @click="handleEditGroup(index)" type="text" size="small">
          {{ t('common.edit') }}
        </Button>
        <Button @click="handleDeleteGroup(index)" type="text" size="small">
          {{ t('common.delete') }}
        </Button>
      </div>
    </Card>
  </TransitionGroup>

  <div style="display: flex; justify-content: center">
    <Button type="link" @click="handleAddGroup">{{ t('common.add') }}</Button>
  </div>

  <Modal v-model:open="showModal" @ok="handleAddEnd" max-width="80" max-height="80">
    <div class="form-item">
      {{ t('kernel.proxyGroups.name') }}
      <Input v-model="fields.name" autofocus />
    </div>
    <div class="form-item">
      {{ t('kernel.proxyGroups.filter') }}
      <Input v-model="fields.filter" placeholder="keyword1|keyword2" />
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

    <div v-for="group in proxyGroup" :key="group.name" class="group">
      <Button
        :type="isExpanded(group.name) ? 'link' : 'text'"
        @click="toggleExpanded(group.name)"
        class="group-title"
      >
        {{ group.name }}
        <div style="margin-left: auto">{{ group.proxies.length }}</div>
      </Button>
      <div v-show="isExpanded(group.name)" class="group-proxies">
        <Empty v-if="group.proxies.length === 0" :description="t('kernel.proxyGroups.empty')" />
        <template v-else>
          <div v-for="proxy in group.proxies" :key="proxy.name" class="group-item">
            <Button
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
.drag-move {
  transition: transform 0.4s;
}

.groups-item {
  display: flex;
  align-items: center;
  padding: 0 8px;
  margin-bottom: 2px;
  .name {
    font-weight: bold;
    .warn {
      color: rgb(200, 193, 11);
      cursor: pointer;
    }
  }
  .count {
    margin-left: 4px;
  }
  .action {
    margin-left: auto;
  }
}

.group {
  .group-title {
    width: 100%;
    display: flex;
    align-items: center;
  }
  .group-proxies {
    display: flex;
    flex-wrap: wrap;
  }
  .group-item {
    display: flex;
    justify-content: center;
    width: calc(25% - 4px);
  }
}
</style>
