<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore, useProfilesStore, useKernelApiStore } from '@/stores'
import { APP_TITLE } from '@/utils/env'
import { ignoredError, sleep } from '@/utils'
import { ProxyMode, ProxyModeOptions } from '@/constant/app'
import { generateConfigFile } from '@/utils/generator'
import {
  KillProcess,
  KernelRunning,
  StartKernel,
  SetSystemProxy,
  ClearSystemProxy
} from '@/utils/bridge'
import { useMessage, useBool } from '@/hooks'
import { KernelWorkDirectory, KernelFilePath } from '@/constant/kernel'
import QuickStart from './QuickStart.vue'
import OverView from './OverView.vue'
import KernelLogs from './KernelLogs.vue'
import KernelController from './KernelController.vue'

const proxyMode = ref<ProxyMode>(ProxyMode.None)
const kernelLoading = ref(false)
const stateLoading = ref(false)
const showController = ref(false)
const homeviewRef = ref<HTMLElement>()
const controllerRef = ref<HTMLElement>()

const { t } = useI18n()
const { message } = useMessage()
const [showLogs, toggleLogs] = useBool(false)
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

  await sleep(1000)

  kernelApiStore.refreshCofig()

  kernelLoading.value = false
}

const stopKernel = () => KillProcess(appSettingsStore.app.kernel.pid)

const setSystemProxy = async () => {
  let type: 'http' | 'socks' = 'http'
  let port = 0
  const { port: _port, 'socks-port': socksPort, 'mixed-port': mixedPort } = kernelApiStore.config

  if (_port) {
    port = _port
  } else if (socksPort) {
    port = socksPort
    type = 'socks'
  } else if (mixedPort) {
    port = mixedPort
  }

  if (!port) {
    message.info('请先设置代理端口')
    return
  }

  try {
    await SetSystemProxy(type, port)
    message.info('设置代理成功')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const clearSystemProxy = async () => {
  try {
    await ClearSystemProxy()
    message.info('清除代理成功')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const setTunnelMode = async () => {
  try {
    await kernelApiStore.updateConfig({ tun: { enable: true } })
    message.info('设置TUN成功')
  } catch (error: any) {
    console.log(error)
    message.info(error)
  }
}

const clearTunnelMode = async () => {
  try {
    await kernelApiStore.updateConfig({ tun: { enable: false } })
    message.info('关闭TUN成功')
  } catch (error: any) {
    console.log(error)
    message.info(error)
  }
}

const updateState = async () => {
  stateLoading.value = true
  const running = await ignoredError(KernelRunning, appSettingsStore.app.kernel.pid)
  appSettingsStore.app.kernel.running = !!running
  stateLoading.value = false
  return !!running
}

const onMouseWheel = (e: WheelEvent) => {
  if (!appSettingsStore.app.kernel.running) return
  const isDown = e.deltaY > 0

  showController.value = isDown || controllerRef.value?.scrollTop !== 0
}

watch(showController, (v) => {
  if (v) {
    kernelApiStore.refreshCofig()
    kernelApiStore.refreshProviderProxies()
  }
})

watch(proxyMode, (mode) => {
  if (mode === ProxyMode.System) {
    clearTunnelMode()
    setSystemProxy()
    return
  }

  if (mode === ProxyMode.Tunnel) {
    clearSystemProxy()
    setTunnelMode()
    return
  }

  clearSystemProxy()
  clearTunnelMode()
})

watch(
  () => kernelApiStore.config.tun.enable,
  (enable) => {
    if (enable) {
      proxyMode.value = ProxyMode.Tunnel
    }
  }
)

onMounted(() => homeviewRef.value?.addEventListener('wheel', onMouseWheel))
onUnmounted(() => homeviewRef.value?.removeEventListener('wheel', onMouseWheel))

updateState().then((running) => {
  if (running) {
    kernelApiStore.refreshCofig()
  }
})
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
          <Radio v-model="proxyMode" :options="ProxyModeOptions" size="small" />
          <Button @click="toggleLogs" type="link" size="small" class="ml-auto">
            {{ t('home.overview.log') }}
          </Button>
          <Button @click="stopKernel" type="link" size="small">
            {{ t('home.overview.stop') }}
          </Button>
        </div>
        <OverView />
        <Divider>
          <Button @click="showController = true" type="link" size="small">
            {{ t('home.overview.controller') }}
          </Button>
        </Divider>
      </div>

      <div ref="controllerRef" :class="{ expanded: showController }" class="controller">
        <KernelController />
      </div>
    </template>
  </div>

  <Modal v-model:open="showLogs" :submit="false" max-width="90" max-height="90" title="Logs">
    <KernelLogs />
  </Modal>

  <Modal v-model:open="showQuickStart" :title="t('subscribes.enterLink')" :footer="false">
    <QuickStart />
  </Modal>
</template>

<style lang="less" scoped>
.blur {
  filter: blur(50px);
}
.homeview {
  position: relative;
  overflow: hidden;
  min-height: calc(100vh - 100px);
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
