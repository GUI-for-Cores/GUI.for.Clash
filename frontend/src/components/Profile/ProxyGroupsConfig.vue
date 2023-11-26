<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ProfileType } from '@/stores/profiles'
import { useSubscribesStore } from '@/stores/subscribes'
import { deepClone, sampleID } from '@/utils'
import { GroupsTypeOptions, StrategyOptions } from '@/constant/kernel'

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
let oldGroupName = ''
const showModal = ref(false)
const groups = ref(deepClone(props.modelValue))
const expandedSet = ref<Set<string>>(new Set(['Built-In', 'Subscribes']))

const proxyGroup = ref([
  {
    name: 'Built-In',
    proxies: [
      { name: 'DIRECT', type: 'built-in' },
      { name: 'REJECT', type: 'built-in' },
      ...groups.value.map((v) => ({ name: v.name, type: v.type }))
    ]
  },
  {
    name: 'Subscribes',
    proxies: []
  }
])

const fields = ref<GroupsType[0]>({
  id: sampleID(),
  name: '',
  type: '',
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
const subscribesStore = useSubscribesStore()

const handleAddGroup = () => {
  updateGroupId = -1
  fields.value = {
    id: sampleID(),
    name: '',
    type: 'select',
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
  oldGroupName = fields.value.name
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
  g.proxies = g.proxies.filter(({ type, name }) => {
    if (type === 'Built-In') {
      if (['DIRECT', 'REJECT'].includes(name)) {
        return true
      }
      return groups.value.some((v) => v.name === name)
    }
    const sub = proxyGroup.value.find((v) => v.name === type)
    if (!sub) return false
    return sub.proxies.some((v) => v.name === name)
  })

  g.use = g.use.filter((v) => subscribesStore.subscribes.some(({ name }) => name === v))
}

const handleEditGroup = (index: number) => {
  updateGroupId = index
  fields.value = deepClone(groups.value[index])
  oldGroupName = fields.value.name
  showModal.value = true
}

const handleAddProxy = (groupName: string, proxyName: string) => {
  if (groupName === 'Built-In' && proxyName === fields.value.name) return
  if (groupName === 'Subscribes') {
    const idx = fields.value.use.findIndex((v) => v === proxyName)
    if (idx !== -1) {
      fields.value.use.splice(idx, 1)
    } else {
      fields.value.use.push(proxyName)
    }
    return
  }
  const idx = fields.value.proxies.findIndex((v) => v.type === groupName && v.name === proxyName)
  if (idx !== -1) {
    fields.value.proxies.splice(idx, 1)
  } else {
    fields.value.proxies.push({ type: groupName, name: proxyName })
  }
}

const handleAddEnd = () => {
  const { name, type } = fields.value
  if (!name) return
  if (updateGroupId === -1) {
    groups.value.push(fields.value)
    proxyGroup.value[0].proxies.push({ name, type })
    return
  }
  if (oldGroupName !== name) updateGroupReferences()
  groups.value[updateGroupId] = fields.value
  const idx = proxyGroup.value[0].proxies.findIndex((v) => v.name === oldGroupName)
  if (idx !== -1) {
    proxyGroup.value[0].proxies.splice(idx, 1, { name, type })
  }
}

const updateGroupReferences = () => {
  groups.value.forEach((v) => {
    v.proxies = v.proxies.map(({ type, name }) => {
      name = name === oldGroupName ? fields.value.name : name
      return { type, name }
    })
  })
}

const isInuse = (groupName: string, proxyName: string) => {
  if (groupName === 'Subscribes') {
    return fields.value.use.includes(proxyName)
  }
  return fields.value.proxies.find((v) => v.type === groupName && v.name === proxyName)
}

const hasLost = (g: GroupsType[0]) => {
  const isProxiesLost = g.proxies.some(({ type, name }) => {
    if (type === 'Built-In') {
      if (['DIRECT', 'REJECT'].includes(name)) {
        return false
      }
      return groups.value.every((v) => v.name !== name)
    }

    const sub = proxyGroup.value.find((v) => v.name === type)
    if (!sub) return true
    return sub.proxies.every((v) => v.name !== name)
  })

  const isUseLost = g.use.some((v) => {
    return subscribesStore.subscribes.every(({ name }) => name !== v)
  })

  return isProxiesLost || isUseLost
}

const toggleExpanded = (key: string) => {
  if (expandedSet.value.has(key)) {
    expandedSet.value.delete(key)
  } else {
    expandedSet.value.add(key)
  }
}

const isExpanded = (key: string) => expandedSet.value.has(key)

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

watch(groups, (v) => emits('update:modelValue', v), { immediate: true })

subscribesStore.subscribes.forEach(async (s) => {
  proxyGroup.value[1].proxies.push({ name: s.name, type: 'use' })
  proxyGroup.value.push({ name: s.name, proxies: s.proxies })
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
        <span v-if="hasLost(g)" class="lost"> [ ! ] </span>
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
      <Input v-model="fields.name" />
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
    <template v-if="['url-test', 'fallback', 'load-balance'].includes(fields.type)">
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
    <div v-show="fields.type === 'url-test'" class="form-item">
      {{ t('kernel.proxyGroups.tolerance') }}
      <Input v-model="fields.tolerance" type="number" />
    </div>
    <div v-show="fields.type === 'load-balance'" class="form-item">
      {{ t('kernel.proxyGroups.strategy.name') }}
      <Radio v-model="fields.strategy" :options="StrategyOptions" />
    </div>

    <Divider> {{ t('profile.use') }} & {{ t('profile.proxies') }} </Divider>

    <div v-for="group in proxyGroup" :key="group.name" class="group">
      <Button :type="isExpanded(group.name) ? 'link' : 'text'" @click="toggleExpanded(group.name)">
        {{ group.name }}
      </Button>
      <div v-show="isExpanded(group.name)" class="group-proxies">
        <Empty v-if="group.proxies.length === 0" :description="t('kernel.proxyGroups.empty')" />
        <template v-else>
          <div v-for="proxy in group.proxies" :key="proxy.name" class="group-item">
            <Button
              @click="handleAddProxy(group.name, proxy.name)"
              :type="isInuse(group.name, proxy.name) ? 'link' : 'text'"
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
    .lost {
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
