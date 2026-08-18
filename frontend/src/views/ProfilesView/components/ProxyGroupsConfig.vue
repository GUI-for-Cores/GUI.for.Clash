<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { DraggableOptions } from '@/constant/app'
import { BuiltInOutbound } from '@/constant/kernel'
import { ProxyGroup } from '@/enums/kernel'
import { useSubscribesStore } from '@/stores'
import { deepClone, sampleID, message, modal } from '@/utils'

import ProxyGroupForm from './ProxyGroupForm.vue'
import ProxyGroupSort from './ProxyGroupSort.vue'

type GroupsType = App.Profile['proxyGroupsConfig']

const groups = defineModel<GroupsType>({ default: () => [] })

const { t } = useI18n()
const subscribesStore = useSubscribesStore()

const handleAdd = () =>
  openGroupModal(
    {
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
    },
    -1,
  )

defineExpose({ handleAdd })

const handleDeleteGroup = (index: number) => {
  groups.value.splice(index, 1)
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

const openGroupModal = (group: GroupsType[number], index: number) => {
  const draft = ref(deepClone(group))
  const m = modal({
    title: 'profile.group',
    width: '80',
    height: '80',
    onOk: () => {
      if (index === -1) {
        groups.value.unshift(draft.value)
        return
      }

      groups.value[index] = draft.value
      const { id, name } = draft.value
      groups.value.forEach((group) => {
        const proxy = group.proxies.find((proxy) => proxy.id === id)
        proxy && (proxy.name = name)
      })
    },
  })
  m.setContent(ProxyGroupForm, { group: draft.value, groups: groups.value }).open()
}

const handleEditGroup = (index: number) => openGroupModal(groups.value[index]!, index)

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
  const group = ref(deepClone(groups.value[index]!))
  const m = modal({
    title: 'kernel.proxyGroups.sort',
    maxWidth: '80',
    maxHeight: '80',
    maskClosable: true,
    onOk: () => {
      groups.value[index] = group.value
    },
  })
  m.setContent(ProxyGroupSort, { group: group.value }).open()
}

const needToAdd = (g: GroupsType[0]) => g.use.length === 0 && g.proxies.length === 0

const showLost = () => message.warn('kernel.proxyGroups.notFound')

const showNeedToAdd = () => message.error('kernel.proxyGroups.needToAdd')
</script>

<template>
  <Empty v-if="groups.length === 0">
    <template #description>
      <Button icon="add" type="primary" size="small" @click="handleAdd">
        {{ t('common.add') }}
      </Button>
    </template>
  </Empty>

  <div v-draggable="[groups, DraggableOptions]">
    <Card v-for="(g, index) in groups" :key="g.id" class="mb-2">
      <div class="flex items-center py-2">
        <div class="font-bold flex items-center" style="min-width: 90px">
          <img v-if="g.icon" :src="g.icon" class="w-18 h-18 mr-4" />
          <span v-if="hasLost(g)" class="warn cursor-pointer" @click="showLost"> [ ! ] </span>
          <span v-if="needToAdd(g)" class="error cursor-pointer" @click="showNeedToAdd">
            [ ! ]
          </span>
          {{ g.name }}
        </div>
        <Button type="link" size="small" @click="handleSortGroup(index)">
          (
          {{ t('profile.use') }}: {{ g.use.length }}
          /
          {{ t('profile.proxies') }}: {{ g.proxies.length }}
          )
        </Button>
        <div class="ml-auto">
          <Button v-if="hasLost(g)" type="text" size="small" @click="handleClearGroup(g)">
            {{ t('common.clear') }}
          </Button>
          <Button icon="edit" type="text" size="small" @click="handleEditGroup(index)" />
          <Button icon="delete" type="text" size="small" @click="handleDeleteGroup(index)" />
        </div>
      </div>
    </Card>
  </div>
</template>

<style lang="less" scoped>
.warn {
  color: rgb(200, 193, 11);
}
.error {
  color: red;
}
</style>
