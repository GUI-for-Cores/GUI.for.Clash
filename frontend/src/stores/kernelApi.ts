import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { CoreStopOutputKeyword, CoreWorkingDirectory } from '@/constant'
import { ProcessInfo, KillProcess, ExecBackground } from '@/bridge'
import { generateConfigFile, ignoredError, updateTrayMenus, getKernelFileName } from '@/utils'
import { getConfigs, setConfigs, getProxies, getProviders } from '@/api/kernel'
import { useAppSettingsStore, useProfilesStore, useLogsStore, useEnvStore } from '@/stores'

export type ProxyType = 'mixed' | 'http' | 'socks'

export const useKernelApiStore = defineStore('kernelApi', () => {
  const envStore = useEnvStore()
  const logsStore = useLogsStore()
  const profilesStore = useProfilesStore()
  const appSettingsStore = useAppSettingsStore()

  /** RESTful API */
  const config = ref<IKernelApiConfig>({
    port: 0,
    'socks-port': 0,
    'mixed-port': 0,
    'interface-name': '',
    'allow-lan': false,
    mode: '',
    tun: {
      enable: false,
      stack: 'gVisor',
      device: '',
    },
  })

  const proxies = ref<Record<string, IKernelProxy>>({})
  const providers = ref<{
    [key: string]: {
      name: string
      proxies: IKernelProxy[]
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

  const updateKernelState = async () => {
    appSettingsStore.app.kernel.running = !!(await ignoredError(
      isKernelRunning,
      appSettingsStore.app.kernel.pid,
    ))

    if (!appSettingsStore.app.kernel.running) {
      appSettingsStore.app.kernel.pid = 0
    }

    statusLoading.value = false

    if (appSettingsStore.app.kernel.running) {
      await refreshConfig()
      await refreshProviderProxies()
      await envStore.updateSystemProxyStatus()
    } else if (appSettingsStore.app.autoStartKernel) {
      await startKernel()
    }
  }

  const startKernel = async () => {
    const { profile: profileID, branch } = appSettingsStore.app.kernel
    const profile = profilesStore.getProfileById(profileID)
    if (!profile) throw 'Choose a profile first'

    await stopKernel()
    await generateConfigFile(profile)

    const fileName = await getKernelFileName(branch === 'alpha')
    const kernelFilePath = CoreWorkingDirectory + '/' + fileName

    loading.value = true

    const onOut = async (out: string, pid: number) => {
      logsStore.recordKernelLog(out)

      if (out.toLowerCase().includes(CoreStopOutputKeyword)) {
        loading.value = false
        appSettingsStore.app.kernel.pid = pid
        appSettingsStore.app.kernel.running = true

        await Promise.all([refreshConfig(), refreshProviderProxies()])

        if (appSettingsStore.app.autoSetSystemProxy) {
          await envStore.setSystemProxy()
        }
      }
    }

    const onEnd = async () => {
      loading.value = false
      appSettingsStore.app.kernel.pid = 0
      appSettingsStore.app.kernel.running = false

      if (appSettingsStore.app.autoSetSystemProxy) {
        await envStore.clearSystemProxy()
      }
    }

    try {
      const pid = await ExecBackground(
        kernelFilePath,
        ['-d', envStore.env.basePath + '/' + CoreWorkingDirectory],
        // stdout
        (out: string) => onOut(out, pid),
        // end
        onEnd,
        {
          stopOutputKeyword: CoreStopOutputKeyword,
        },
      )
    } catch (error) {
      loading.value = false
      throw error
    }
  }

  const stopKernel = async () => {
    const { pid } = appSettingsStore.app.kernel
    const running = await ignoredError(isKernelRunning, pid)
    running && (await KillProcess(pid))

    appSettingsStore.app.kernel.pid = 0
    appSettingsStore.app.kernel.running = false

    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.clearSystemProxy()
    }

    logsStore.clearKernelLog()
  }

  const restartKernel = async () => {
    await stopKernel()
    await startKernel()
  }

  const getProxyPort = ():
    | {
        port: number
        proxyType: ProxyType
      }
    | undefined => {
    const { port, 'socks-port': socksPort, 'mixed-port': mixedPort } = config.value

    if (mixedPort) {
      return {
        port: mixedPort,
        proxyType: 'mixed',
      }
    }
    if (port) {
      return {
        port,
        proxyType: 'http',
      }
    }
    if (socksPort) {
      return {
        port: socksPort,
        proxyType: 'socks',
      }
    }
    return undefined
  }

  watch(
    [() => config.value.mode, () => config.value.tun.enable, () => proxies.value],
    updateTrayMenus,
  )

  return {
    startKernel,
    stopKernel,
    restartKernel,
    updateKernelState,
    loading,
    statusLoading,
    config,
    proxies,
    providers,
    refreshConfig,
    updateConfig,
    refreshProviderProxies,
    getProxyPort,
  }
})
