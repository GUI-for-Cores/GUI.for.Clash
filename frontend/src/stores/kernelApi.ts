import { ref } from 'vue'
import { defineStore } from 'pinia'

import { generateConfigFile, ignoredError } from '@/utils'
import type { KernelApiConfig, Proxy } from '@/api/kernel.schema'
import { KernelWorkDirectory, getKernelFileName } from '@/constant'
import { getConfigs, setConfigs, getProxies, getProviders } from '@/api/kernel'
import { ProcessInfo, KillProcess, ExecBackground } from '@/utils/bridge'
import {
  useAppSettingsStore,
  useProfilesStore,
  useLogsStore,
  useEnvStore,
  useAppStore
} from '@/stores'

export const useKernelApiStore = defineStore('kernelApi', () => {
  /** RESTful API */
  const config = ref<KernelApiConfig>({
    port: 0,
    'socks-port': 0,
    'mixed-port': 0,
    'interface-name': '',
    'allow-lan': false,
    mode: '',
    tun: {
      enable: false,
      stack: 'System',
      device: ''
    }
  })

  const proxies = ref<Record<string, Proxy>>({})
  const providers = ref<{
    [key: string]: {
      name: string
      proxies: Proxy[]
    }
  }>({})

  const refreshConfig = async () => {
    config.value = await getConfigs()
  }

  const updateConfig = async (options: Record<string, any>) => {
    await setConfigs(options)
    await refreshConfig()
  }

  const refreshProviderProxies = async () => {
    const [{ providers: a }, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    providers.value = a
    proxies.value = b
  }

  /* Bridge API */
  const loading = ref(false)
  const statusLoading = ref(true)

  const isKernelRunning = async (pid: number) => {
    return pid && (await ProcessInfo(pid)).startsWith('mihomo')
  }

  const updateKernelStatus = async () => {
    const appSettingsStore = useAppSettingsStore()

    const running = await ignoredError(isKernelRunning, appSettingsStore.app.kernel.pid)

    appSettingsStore.app.kernel.running = !!running

    if (!appSettingsStore.app.kernel.running) {
      appSettingsStore.app.kernel.pid = 0
    }

    return appSettingsStore.app.kernel.running
  }

  const startKernel = async () => {
    const appStore = useAppStore()
    const envStore = useEnvStore()
    const logsStore = useLogsStore()
    const profilesStore = useProfilesStore()
    const appSettingsStore = useAppSettingsStore()

    const { profile: profileID, branch } = appSettingsStore.app.kernel
    if (!profileID) throw 'Choose a profile first'

    const profile = profilesStore.getProfileById(profileID)
    if (!profile) throw 'Profile does not exist: ' + profileID

    await stopKernel()
    await generateConfigFile(profile)

    const fileName = await getKernelFileName(branch === 'alpha')
    const kernelFilePath = KernelWorkDirectory + '/' + fileName

    loading.value = true

    const pid = await ExecBackground(
      kernelFilePath,
      ['-d', envStore.env.basePath + '/' + KernelWorkDirectory],
      // stdout
      async (out: string) => {
        logsStore.recordKernelLog(out)
        if (out.toLowerCase().includes('start initial compatible provider default')) {
          loading.value = false
          appSettingsStore.app.kernel.pid = pid
          appSettingsStore.app.kernel.running = true

          await refreshConfig()

          // Automatically set system proxy, but the priority is lower than tun mode
          if (!config.value.tun.enable && appSettingsStore.app.autoSetSystemProxy) {
            await envStore.setSystemProxy()
          }

          appStore.updateTrayMenus()
        }
      },
      // end
      async () => {
        loading.value = false
        appSettingsStore.app.kernel.pid = 0
        appSettingsStore.app.kernel.running = false

        if (appSettingsStore.app.autoSetSystemProxy) {
          await envStore.clearSystemProxy()
        }

        appStore.updateTrayMenus()
      }
    )
  }

  const stopKernel = async () => {
    const appStore = useAppStore()
    const logsStore = useLogsStore()
    const appSettingsStore = useAppSettingsStore()

    const { pid } = appSettingsStore.app.kernel

    const running = await ignoredError(isKernelRunning, pid)
    running && (await KillProcess(pid))

    appSettingsStore.app.kernel.pid = 0
    appSettingsStore.app.kernel.running = false

    logsStore.clearKernelLog()

    appStore.updateTrayMenus()
  }

  const restartKernel = async () => {
    await stopKernel()
    await startKernel()
  }

  return {
    startKernel,
    stopKernel,
    restartKernel,
    updateKernelStatus,
    loading,
    statusLoading,
    config,
    proxies,
    providers,
    refreshConfig,
    updateConfig,
    refreshProviderProxies
  }
})
