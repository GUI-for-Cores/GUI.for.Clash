import { ref } from 'vue'
import { defineStore } from 'pinia'

import { generateConfigFile, ignoredError } from '@/utils'
import type { KernelApiConfig, Proxy } from '@/api/kernel.schema'
import { KernelWorkDirectory, getKernelFileName } from '@/constant'
import { KernelRunning, KillProcess, ExecBackground } from '@/utils/bridge'
import { getConfigs, setConfigs, getProxies, getProviders } from '@/api/kernel'
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
  }

  const refreshProviderProxies = async () => {
    const [{ providers: a }, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    providers.value = a
    proxies.value = b
  }

  /* Bridge API */
  const loading = ref(false)

  const updateKernelStatus = async () => {
    const appSettingsStore = useAppSettingsStore()

    const { pid } = appSettingsStore.app.kernel

    const running = await ignoredError(KernelRunning, pid)

    appSettingsStore.app.kernel.running = !!running

    return appSettingsStore.app.kernel.running
  }

  const startKernel = async () => {
    const appStore = useAppStore()
    const envStore = useEnvStore()
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

    const _pid = await ExecBackground(
      kernelFilePath,
      ['-d', envStore.env.basePath + '/' + KernelWorkDirectory],
      // stdout
      async (out: string) => {
        logsStore.recordKernelLog(out)
        if (out.toLowerCase().includes('start initial compatible provider default')) {
          loading.value = false
          appSettingsStore.app.kernel.running = true

          await refreshConfig()
          await envStore.updateSystemProxyState()

          // Automatically set system proxy, but the priority is lower than tun mode
          if (!config.value.tun.enable && appSettingsStore.app.autoSetSystemProxy) {
            await envStore.setSystemProxy()
          }
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
      }
    )

    loading.value = true

    appSettingsStore.app.kernel.pid = _pid
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
    loading,
    config,
    proxies,
    providers,
    refreshConfig,
    updateConfig,
    refreshProviderProxies
  }
})
