<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore, useProfilesStore, useKernelApiStore } from '@/stores'
import { APP_TITLE } from '@/utils/env'
import { ignoredError, sleep } from '@/utils'
import { generateConfigFile } from '@/utils/generator'
import {
  KillProcess,
  KernelRunning,
  StartKernel,
  SetSystemProxy,
  ClearSystemProxy,
  GetSystemProxy
} from '@/utils/bridge'
import { useMessage, useBool } from '@/hooks'
import { KernelWorkDirectory, KernelFilePath } from '@/constant/kernel'
import QuickStart from './QuickStart.vue'
import OverView from './OverView.vue'
import KernelLogs from './KernelLogs.vue'
import GroupsController from './GroupsController.vue'
import CommonController from './CommonController.vue'

const systemProxy = ref(false)
const kernelLoading = ref(false)
const stateLoading = ref(true)
const showController = ref(false)
const homeviewRef = ref<HTMLElement>()
const controllerRef = ref<HTMLElement>()

const { t } = useI18n()
const { message } = useMessage()
const [showLogs, toggleLogs] = useBool(false)
const [showSettings, toggleSettingsModal] = useBool(false)
const [showQuickStart, toggleQuickStart] = useBool(false)
const appSettingsStore = useAppSettingsStore()
const profilesStore = useProfilesStore()
const kernelApiStore = useKernelApiStore()

const profileOptions = computed(() =>
  profilesStore.profiles.map(({ name }) => ({ label: name, value: name }))
)

const startKernel = async () => {
  const { profile: currentProfile } = appSettingsStore.app.kernel

  if (!currentProfile) {
    message.info('Choose a profile first')
    return
  }

  const profile = profilesStore.getProfileByName(currentProfile)
  if (!profile) {
    message.info('Profile does not exist: ' + currentProfile)
    return
  }

  kernelLoading.value = true

  await generateConfigFile(profile)

  const { pid } = appSettingsStore.app.kernel

  if (pid) {
    const running = await ignoredError(KernelRunning, pid)
    if (running) {
      await ignoredError(KillProcess, pid)
      appSettingsStore.app.kernel.running = false
    }
  }

  try {
    await StartKernel(KernelFilePath, KernelWorkDirectory)
  } catch (error: any) {
    console.log(error)
    message.info(error)
    kernelLoading.value = false
    return
  }

  await sleep(2000)

  kernelLoading.value = false

  await kernelApiStore.refreshCofig()

  updateSystemProxyState()
}

const stopKernel = async () => {
  await ignoredError(KillProcess, appSettingsStore.app.kernel.pid)
  appSettingsStore.app.kernel.running = false
}

const setSystemProxy = async () => {
  let port = 0
  const { port: _port, 'socks-port': socksPort, 'mixed-port': mixedPort } = kernelApiStore.config

  if (mixedPort) {
    port = mixedPort
  } else if (_port) {
    port = _port
  } else if (socksPort) {
    systemProxy.value = false
    message.info(t('home.overview.notSupportSocks'))
    return
  }

  if (!port) {
    systemProxy.value = false
    message.info(t('home.overview.needPort'))
    return
  }

  try {
    await SetSystemProxy(port)
  } catch (error: any) {
    systemProxy.value = false
    message.info(error)
    console.log(error)
  }
}

const clearSystemProxy = async () => {
  try {
    await ClearSystemProxy()
  } catch (error: any) {
    systemProxy.value = true
    message.info(error)
    console.log(error)
  }
}

const updateKernelState = async () => {
  stateLoading.value = true
  const running = await ignoredError(KernelRunning, appSettingsStore.app.kernel.pid)
  appSettingsStore.app.kernel.running = !!running
  stateLoading.value = false
  return !!running
}

const updateSystemProxyState = async () => {
  const proxyServer = await GetSystemProxy()
  if (!proxyServer) {
    systemProxy.value = false
    return
  }

  const { port: _port, 'mixed-port': mixedPort } = kernelApiStore.config

  const proxyServerList = [`127.0.0.1:${_port}`, `127.0.0.1:${mixedPort}`]

  systemProxy.value = proxyServerList.includes(proxyServer)
}

const onMouseWheel = (e: WheelEvent) => {
  if (!appSettingsStore.app.kernel.running) return
  const isDown = e.deltaY > 0

  showController.value = isDown || controllerRef.value?.scrollTop !== 0
}

watch(showController, (v) => {
  if (v) {
    kernelApiStore.refreshProviderProxies()
  } else {
    kernelApiStore.refreshCofig()
  }
})

watch(systemProxy, (enable) => {
  if (enable) setSystemProxy()
  else clearSystemProxy()
})

watch(
  () => kernelApiStore.config.tun.enable,
  async (enable, ov) => {
    if (enable !== ov) {
      await kernelApiStore.updateConfig({ tun: { enable } })
    }
  }
)

onMounted(() => homeviewRef.value?.addEventListener('wheel', onMouseWheel))
onUnmounted(() => homeviewRef.value?.removeEventListener('wheel', onMouseWheel))

updateKernelState().then((running) => {
  if (running) {
    kernelApiStore.refreshCofig()
  }
})

updateSystemProxyState()
</script>

<template>
  <div ref="homeviewRef" class="homeview">
    <div v-if="!appSettingsStore.app.kernel.running || kernelLoading" class="center">
      <img src="@/assets/logo.png" draggable="false" style="margin-bottom: 16px" />

      <template v-if="profilesStore.profiles.length === 0">
        <p>{{ t('home.noProfile', [APP_TITLE]) }}</p>
        <Button @click="toggleQuickStart" type="primary">{{ t('home.quickStart') }}</Button>
      </template>

      <template v-else>
        <Select v-model="appSettingsStore.app.kernel.profile" :options="profileOptions" />
        <Button @click="startKernel" :loading="kernelLoading" type="primary" size="large">
          {{ t('home.overview.start') }}
        </Button>
        <Button @click="toggleQuickStart" type="link" size="small">
          {{ t('home.quickStart') }}
        </Button>
      </template>
    </div>

    <template v-else-if="!stateLoading">
      <div :class="{ blur: showController }">
        <div class="kernel-status">
          <Button @click="toggleSettingsModal" type="text" size="small">
            <Icon icon="settings" />
          </Button>
          <Switch v-model="systemProxy" size="small" border="square" class="ml-4">
            {{ t('home.overview.systemProxy') }}
          </Switch>
          <Switch
            v-model="kernelApiStore.config.tun.enable"
            size="small"
            border="square"
            class="ml-8"
          >
            {{ t('home.overview.tunMode') }}
          </Switch>
          <Button @click="toggleLogs" type="text" size="small" class="ml-auto">
            <Icon icon="log" />
          </Button>
          <Button @click="stopKernel" type="text" size="small">
            <Icon icon="stop" />
          </Button>
        </div>
        <OverView />
      </div>

      <div ref="controllerRef" :class="{ expanded: showController }" class="controller">
        <GroupsController />
      </div>
    </template>
  </div>

  <Modal v-model:open="showLogs" :submit="false" max-width="90" max-height="90" title="Logs">
    <KernelLogs />
  </Modal>

  <Modal v-model:open="showQuickStart" :title="t('subscribes.enterLink')" :footer="false">
    <QuickStart />
  </Modal>

  <Modal
    v-model:open="showSettings"
    :title="t('home.overview.settings')"
    :submit="false"
    width="80"
    mask-closable
  >
    <CommonController />
  </Modal>
</template>

<style lang="less" scoped>
.blur {
  filter: blur(50px);
}
.homeview {
  position: relative;
  overflow: hidden;
  height: 100%;
}

.center {
  position: absolute;
  width: 100%;
  height: 90%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.kernel-status {
  display: flex;
  align-items: center;
  background-color: var(--card-bg);
  padding: 2px 8px;
  border-radius: 8px;
  .ml-4 {
    margin-left: 4px;
  }
  .ml-8 {
    margin-left: 8px;
  }
  .ml-auto {
    margin-left: auto;
  }
}

.controller {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 100%;
  overflow-y: auto;
  transition: all 0.4s;
}

.expanded {
  top: 0;
}
</style>
