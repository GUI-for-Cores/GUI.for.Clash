<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore, useProfilesStore } from '@/stores'
import { ignoredError } from '@/utils'
import { generateConfigFile } from '@/utils/generator'
import { KillProcess, KernelRunning, StartKernel } from '@/utils/bridge'
import { useMessage } from '@/hooks/useMessage'
import { KernelWorkDirectory, KernelFilePath } from '@/constant/kernel'
import ProxiesControl from './ProxiesControl.vue'
import QuickStartView from './QuickStartView.vue'
import OverView from './OverView.vue'

const kernelLoading = ref(false)
const stateLoading = ref(false)
const isExpanded = ref(false)
const homeviewRef = ref<HTMLElement>()
const controllerRef = ref<HTMLElement>()
const proxiesControl = ref()

const { t } = useI18n()
const { message } = useMessage()
const appSettingsStore = useAppSettingsStore()
const profilesStore = useProfilesStore()

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

  isExpanded.value = isDown || controllerRef.value?.scrollTop !== 0
}

watch(isExpanded, (v) => {
  if (v && proxiesControl.value) {
    proxiesControl.value.updateGroups()
  }
})

onMounted(() => homeviewRef.value?.addEventListener('wheel', onMouseWheel))
onUnmounted(() => homeviewRef.value?.removeEventListener('wheel', onMouseWheel))

updateState()
</script>

<template>
  <div ref="homeviewRef" class="homeview">
    <QuickStartView v-if="profilesStore.profiles.length === 0" />

    <div v-else-if="!appSettingsStore.app.kernel.running" class="center">
      <img src="@/assets/logo.png" draggable="false" style="margin-bottom: 32px" />
      <Select v-model="appSettingsStore.app.kernel.profile" :options="profileOptions" />
      <Button @click="startKernel" :loading="kernelLoading" type="primary" size="large">
        {{ t('home.overview.start') }}
      </Button>
    </div>
    <template v-else-if="!stateLoading">
      <div :class="{ blur: isExpanded }">
        <div class="kernel-status">
          <div class="running">
            {{ t('home.overview.running') }}
          </div>
          <Button @click="stopKernel" type="link" size="small" class="stop">
            {{ t('home.overview.stop') }}
          </Button>
        </div>
        <OverView />
        <Divider>
          <Button @click="isExpanded = true" type="link" size="small">
            {{ t('home.overview.controller') }}
          </Button>
        </Divider>
      </div>

      <div ref="controllerRef" :class="{ expanded: isExpanded }" class="controller">
        <Divider>
          <Button @click="isExpanded = false" type="link" size="small">
            {{ t('home.overview.controller') }}
          </Button>
        </Divider>
        <ProxiesControl ref="proxiesControl" />
      </div>
    </template>
  </div>
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
  .stop {
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
