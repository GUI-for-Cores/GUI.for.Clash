import { ref } from 'vue'
import { defineStore } from 'pinia'

import { generateConfigFile, ignoredError } from '@/utils'
import type { KernelApiConfig, Proxy } from '@/api/kernel.schema'
import { KernelWorkDirectory, getKernelFileName } from '@/constant'
import { useAppSettingsStore, useProfilesStore, useLogsStore, useEnvStore } from '@/stores'
import { getConfigs, setConfigs, getProxies, getProviders } from '@/api/kernel'
import { EventsOn, KernelRunning, KillProcess, StartKernel } from '@/utils/bridge'

export const useKernelApiStore = defineStore('kernelApi', () => {
  /** RESTful API */
  const config = ref<KernelApiConfig>({
    port: 0,
    'mixed-port': 0,
    'socks-port': 0,
    'log-level': '',
    'allow-lan': false,
    mode: '',
    ipv6: false,
    'interface-name': '',
    tun: {
      enable: false,
      stack: 'System',
      'auto-route': true,
      device: ''
    }
  })

  const proxies = ref<Record<string, Proxy>>({})
  const providers = ref<
    Record<
      string,
      {
        name: string
        proxies: Proxy[]
      }
    >
  >({})

  const refreshConfig = async () => {
    config.value = await getConfigs()
  }

  const updateConfig = async (options: Record<string, any>) => {
    await setConfigs(options)
  }

  const refreshProviderProxies = async () => {
    const [{ providers: a }, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    providers.value = a
    proxies.value = b
  }

  /* Bridge API */
  const loading = ref(false)

  const setupKernelApi = async () => {
    const envStore = useEnvStore()
    const logsStore = useLogsStore()
    const appSettings = useAppSettingsStore()

    EventsOn('kernelLog', logsStore.recordKernelLog)
    EventsOn('kernelPid', (pid) => {
      loading.value = true
      appSettings.app.kernel.pid = pid
    })
    EventsOn('kernelStarted', async () => {
      loading.value = false
      appSettings.app.kernel.running = true

      await refreshConfig()
      await envStore.updateSystemProxyState()

      // Automatically set system proxy, but the priority is lower than tun mode
      if (!config.value.tun.enable && appSettings.app.autoSetSystemProxy) {
        await envStore.setSystemProxy()
      }
    })
    EventsOn('kernelStopped', async () => {
      loading.value = false
      appSettings.app.kernel.pid = 0
      appSettings.app.kernel.running = false

      if (appSettings.app.autoSetSystemProxy) {
        await envStore.clearSystemProxy()
      }
    })
  }

  const updateKernelStatus = async () => {
    const appSettingsStore = useAppSettingsStore()

    const { pid } = appSettingsStore.app.kernel

    const running = await ignoredError(KernelRunning, pid)

    appSettingsStore.app.kernel.running = !!running

    return appSettingsStore.app.kernel.running
  }

  const startKernel = async () => {
    const logsStore = useLogsStore()
    const profilesStore = useProfilesStore()
    const appSettingsStore = useAppSettingsStore()

    const { profile: profileID, branch, pid } = appSettingsStore.app.kernel

    if (!profileID) throw 'Choose a profile first'

    const profile = profilesStore.getProfileById(profileID)

    if (!profile) throw 'Profile does not exist: ' + profileID

    logsStore.clearKernelLog()

    await generateConfigFile(profile)

    if (pid) {
      const running = await ignoredError(KernelRunning, pid)
      if (running) {
        await ignoredError(KillProcess, pid)
        appSettingsStore.app.kernel.running = false
      }
    }

    const fileName = await getKernelFileName(branch === 'alpha')

    const kernelFilePath = KernelWorkDirectory + '/' + fileName

    await StartKernel(kernelFilePath, KernelWorkDirectory)
  }

  const stopKernel = async () => {
    const logsStore = useLogsStore()
    const appSettingsStore = useAppSettingsStore()

    await ignoredError(KillProcess, appSettingsStore.app.kernel.pid)

    appSettingsStore.app.kernel.running = false
    appSettingsStore.app.kernel.pid = 0

    logsStore.clearKernelLog()
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
    setupKernelApi,
    loading,
    config,
    proxies,
    providers,
    refreshConfig,
    updateConfig,
    refreshProviderProxies
  }
})
