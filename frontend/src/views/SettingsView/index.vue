<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppStore } from '@/stores'

import CoreSettings from './components/CoreSettings.vue'
import GeneralSettings from './components/GeneralSettings.vue'

const settings = [
  { key: 'general', tab: 'settings.general' },
  { key: 'kernel', tab: 'router.kernel' },
]

const activeKey = ref(settings[0].key)

const { t } = useI18n()
const appStore = useAppStore()
</script>

<template>
  <Tabs v-model:active-key="activeKey" :items="settings" height="100%">
    <template #general>
      <GeneralSettings />
    </template>

    <template #kernel>
      <CoreSettings />
    </template>

    <template #extra>
      <Button @click="appStore.showAbout = true" type="text">
        {{ t('router.about') }}
      </Button>
    </template>
  </Tabs>
</template>
