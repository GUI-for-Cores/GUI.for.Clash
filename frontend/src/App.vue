<script setup lang="ts">
import { ref } from 'vue'
import { useAppSettingsStore, useProfilesStore, useSubscribesStore } from '@/stores'
import { ignoredError, sleep } from '@/utils'
import { useEvents } from '@/hooks/useEvents'
import { NavigationBar, MainPage, TitleBar } from '@/components'
import SplashView from '@/views/SplashView.vue'

const loading = ref(true)

const appSettings = useAppSettingsStore()
const profilesStore = useProfilesStore()
const subscribesStore = useSubscribesStore()

useEvents()

appSettings.setupAppSettings().then(async () => {
  await ignoredError(profilesStore.setupProfiles)
  await ignoredError(subscribesStore.setupSubscribes)
  await sleep(1000)
  loading.value = false
})
</script>

<template>
  <SplashView v-if="loading" />
  <template v-else>
    <TitleBar />
    <div class="main">
      <NavigationBar />
      <MainPage />
    </div>
  </template>
</template>

<style scoped>
.main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--bg-color);
}
</style>
