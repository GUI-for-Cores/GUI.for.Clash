<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { DraggableOptions } from '@/constant/app'
import { useSubscribesStore } from '@/stores'

interface Props {
  group: App.Profile['proxyGroupsConfig'][number]
}

defineProps<Props>()

const { t } = useI18n()
const subscribesStore = useSubscribesStore()

const getSubscribeName = (id: string) => subscribesStore.getSubscribeById(id)?.name || id
</script>

<template>
  <Divider>{{ t('profile.use') }}</Divider>
  <Empty v-if="group.use.length === 0" />
  <div v-draggable="[group.use, DraggableOptions]">
    <Button v-for="use in group.use" :key="use" type="link" class="group-item">
      {{ getSubscribeName(use) }}
    </Button>
  </div>

  <Divider>{{ t('profile.proxies') }}</Divider>
  <Empty v-if="group.proxies.length === 0" />
  <div v-draggable="[group.proxies, DraggableOptions]">
    <Button v-for="proxy in group.proxies" :key="proxy.id" type="link" class="group-item">
      {{ proxy.name }}
    </Button>
  </div>
</template>
