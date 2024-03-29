<script setup lang="ts">
import { ref } from 'vue'

import * as Stores from '@/stores'
import { EventsOn } from '@/bridge'
import { ignoredError, sampleID, sleep } from '@/utils'
import { useMessage, usePicker, useConfirm, usePrompt, useAlert } from '@/hooks'

import AboutView from '@/views/AboutView.vue'
import SplashView from '@/views/SplashView.vue'
import CommandView from './views/CommandView.vue'
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
const scheduledTasksStore = Stores.useScheduledTasksStore()

const { message } = useMessage()
const { picker } = usePicker()
const { confirm } = useConfirm()
const { prompt } = usePrompt()
const { alert } = useAlert()

window.Plugins.message = message
window.Plugins.picker = picker
window.Plugins.confirm = confirm
window.Plugins.prompt = prompt
window.Plugins.alert = alert

EventsOn('launchArgs', async (args: string[]) => {
  console.log('launchArgs', args)
  const url = new URL(args[0])
  if (url.pathname === '//install-config/') {
    const _url = url.searchParams.get('url')
    const _name = url.searchParams.get('name') || sampleID()

    if (!_url) {
      message.error('URL missing')
      return
    }

    try {
      await subscribesStore.importSubscribe(_name, _url)
      message.success('common.success')
    } catch (error: any) {
      message.error(error)
    }
  }
})

window.addEventListener('beforeunload', scheduledTasksStore.removeScheduledTasks)

appSettings.setupAppSettings().then(async () => {
  await Promise.all([
    ignoredError(envStore.setupEnv),
    ignoredError(profilesStore.setupProfiles),
    ignoredError(subscribesStore.setupSubscribes),
    ignoredError(rulesetsStore.setupRulesets),
    ignoredError(pluginsStore.setupPlugins),
    ignoredError(scheduledTasksStore.setupScheduledTasks)
  ])

  await sleep(1000)

  loading.value = false

  kernelApiStore.updateKernelStatus().then(async (running) => {
    kernelApiStore.statusLoading = false
    try {
      if (running) {
        await kernelApiStore.refreshConfig()
        await kernelApiStore.refreshProviderProxies()
        await envStore.updateSystemProxyStatus()
      } else if (appSettings.app.autoStartKernel) {
        await kernelApiStore.startKernel()
      }
    } catch (error: any) {
      message.error(error)
    }
  })

  try {
    await pluginsStore.onStartupTrigger()
  } catch (error: any) {
    message.error(error)
  }
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

  <Modal
    v-model:open="appStore.showAbout"
    :cancel="false"
    :submit="false"
    mask-closable
    min-width="50"
  >
    <AboutView />
  </Modal>

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

  <CommandView />
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
