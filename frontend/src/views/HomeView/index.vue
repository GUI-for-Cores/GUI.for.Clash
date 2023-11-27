<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore, useProfilesStore, useKernelApiStore } from '@/stores'
import { ignoredError, sleep } from '@/utils'
import { generateConfigFile } from '@/utils/generator'
import { KillProcess, KernelRunning, StartKernel } from '@/utils/bridge'
import { useMessage, useBool } from '@/hooks'
import { KernelWorkDirectory, KernelFilePath } from '@/constant/kernel'
import QuickStartView from './QuickStartView.vue'
import OverView from './OverView.vue'
import KernelLogs from './KernelLogs.vue'
import CommonControl from './CommonControl.vue'
import ProxiesControl from './ProxiesControl.vue'

const kernelLoading = ref(false)
const stateLoading = ref(false)
const showController = ref(false)
const homeviewRef = ref<HTMLElement>()
const controllerRef = ref<HTMLElement>()

const { t } = useI18n()
const { message } = useMessage()
const [showLogs, toggleLogs] = useBool(false)
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
    message.info('Profile does not exist')
    return
  }

  kernelLoading.value = true

  await generateConfigFile(profile)

  const { pid } = appSettingsStore.app.kernel

  const running = await ignoredError(KernelRunning, pid)
  if (running) {
    await ignoredError(KillProcess, pid)
    appSettingsStore.app.kernel.running = false
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

const stopKernel = async () => {
  const { pid } = appSettingsStore.app.kernel
  const running = await ignoredError(KernelRunning, pid)
  if (running) {
    await ignoredError(KillProcess, pid)
  }
  await updateState()
}

const updateState = async () => {
  stateLoading.value = true
  const running = await ignoredError(KernelRunning, appSettingsStore.app.kernel.pid)
  appSettingsStore.app.kernel.running = !!running
  stateLoading.value = false
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

onMounted(() => homeviewRef.value?.addEventListener('wheel', onMouseWheel))
onUnmounted(() => homeviewRef.value?.removeEventListener('wheel', onMouseWheel))

updateState()
</script>

<template>
  <div ref="homeviewRef" class="homeview">
    <QuickStartView v-if="profilesStore.profiles.length === 0" />

    <div v-else-if="!appSettingsStore.app.kernel.running || kernelLoading" class="center">
      <img src="@/assets/logo.png" draggable="false" style="margin-bottom: 32px" />
      <Select v-model="appSettingsStore.app.kernel.profile" :options="profileOptions" />
      <Button @click="startKernel" :loading="kernelLoading" type="primary" size="large">
        {{ t('home.overview.start') }}
      </Button>
    </div>
    <template v-else-if="!stateLoading">
      <div :class="{ blur: showController }">
        <div class="kernel-status">
          <div class="running">
            {{ t('home.overview.running') }}
          </div>
          <Button @click="toggleLogs" type="link" size="small" class="logs">
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
        <CommonControl v-if="!false" />
        <ProxiesControl />
      </div>
    </template>
  </div>

  <Modal v-model:open="showLogs" :submit="false" max-width="90" max-height="90" title="Logs">
    <KernelLogs />
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
  .running {
    &:before {
      content: '';
      display: inline-block;
      width: 12px;
      height: 12px;
      margin: 0 8px;
      border-radius: 8px;
      background: var(--primary-color);
    }
  }
  .logs {
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
