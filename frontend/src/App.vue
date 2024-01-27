<script setup lang="ts">
import { ref } from 'vue'

import { useMessage } from '@/hooks'
import * as Stores from '@/stores'
import { EventsOn } from '@/utils/bridge'
import { ignoredError, sleep } from '@/utils'

import SplashView from '@/views/SplashView.vue'
import { NavigationBar, MainPage, TitleBar } from '@/components'

const loading = ref(true)

const envStore = Stores.useEnvStore()
const appStore = Stores.useAppStore()
const pluginsStore = Stores.usePluginsStore()
const profilesStore = Stores.useProfilesStore()
const rulesetsStore = Stores.useRulesetsStore()
const appSettings = Stores.useAppSettingsStore()
const kernelApiStore = Stores.useKernelApiStore()
const subscribesStore = Stores.useSubscribesStore()

const { message } = useMessage()
window.Plugins.message = message

EventsOn('launchArgs', (args) => {
  console.log(args)
})

appSettings.setupAppSettings().then(async () => {
  await Promise.all([
    ignoredError(envStore.setupEnv),
    ignoredError(profilesStore.setupProfiles),
    ignoredError(subscribesStore.setupSubscribes),
    ignoredError(rulesetsStore.setupRulesets),
    ignoredError(pluginsStore.setupPlugins)
  ])

  kernelApiStore.updateKernelStatus().then(async (running) => {
    kernelApiStore.statusLoading = false
    if (running) {
      await kernelApiStore.refreshConfig()
      await envStore.updateSystemProxyState()
    } else if (appSettings.app.autoStartKernel) {
      await kernelApiStore.startKernel()
    }

    appStore.updateTrayMenus()
  })

  await sleep(1000)

  loading.value = false

  pluginsStore.onStartupTrigger()
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

  <Menu
    v-model="appStore.menuShow"
    :position="appStore.menuPosition"
    :menu-list="appStore.menuList"
  />

  <Tips
    v-model="appStore.tipsShow"
    :position="appStore.tipsPosition"
    :message="appStore.tipsMessage"
  />
</template>

<style scoped>
.main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 8px;
}
</style>
