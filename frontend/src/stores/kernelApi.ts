import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { getConfigs, setConfigs, getProxies, getProviders, Api } from '@/api/kernel'
import { ProcessInfo, KillProcess, ExecBackground } from '@/bridge'
import { CoreStopOutputKeyword, CoreWorkingDirectory } from '@/constant'
import {
  useAppSettingsStore,
  useProfilesStore,
  useLogsStore,
  useEnvStore,
  usePluginsStore,
} from '@/stores'
import {
  generateConfigFile,
  ignoredError,
  updateTrayMenus,
  getKernelFileName,
  WebSockets,
  setIntervalImmediately,
  debounce,
} from '@/utils'

import type {
  CoreApiConfig,
  CoreApiProxy,
  CoreApiLogsData,
  CoreApiMemoryData,
  CoreApiTrafficData,
  CoreApiConnectionsData,
} from '@/types/kernel'

export type ProxyType = 'mixed' | 'http' | 'socks'

export const useKernelApiStore = defineStore('kernelApi', () => {
  const envStore = useEnvStore()
  const logsStore = useLogsStore()
  const pluginsStore = usePluginsStore()
  const profilesStore = useProfilesStore()
  const appSettingsStore = useAppSettingsStore()

  /** RESTful API */
  const config = ref<CoreApiConfig>({
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

  const proxies = ref<Record<string, CoreApiProxy>>({})
  const providers = ref<{
    [key: string]: {
      name: string
      proxies: CoreApiProxy[]
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

  /* WebSocket */
  let websocketInstance: WebSockets | null
  const longLivedWS = {
    setup: undefined as (() => void) | undefined,
    cleanup: undefined as (() => void) | undefined,
    timer: -1,
  }
  const shortLivedWS = {
    setup: undefined as (() => void) | undefined,
    cleanup: undefined as (() => void) | undefined,
    timer: -1,
  }
  const onLogsEvents = {
    onFirst: undefined as (() => void) | undefined,
    onEmpty: undefined as (() => void) | undefined,
  }

  const websocketHandlers = {
    logs: [] as ((data: CoreApiLogsData) => void)[],
    memory: [] as ((data: CoreApiMemoryData) => void)[],
    traffic: [] as ((data: CoreApiTrafficData) => void)[],
    connections: [] as ((data: CoreApiConnectionsData) => void)[],
  } as const

  const createCoreWSHandlerRegister = <S extends C[], C>(
    source: S,
    events: { onFirst?: () => void; onEmpty?: () => void } = {},
  ) => {
    const register = (cb: S[number]) => {
      source.push(cb)
      source.length === 1 && events.onFirst?.()
      const unregister = () => {
        const idx = source.indexOf(cb)
        idx !== -1 && source.splice(idx, 1)
        source.length === 0 && events.onEmpty?.()
      }
      return unregister
    }
    return register
  }

  const createCoreWSDispatcher = <T>(source: ((data: T) => void)[]) => {
    return (data: T) => {
      source.forEach((cb) => cb(data))
    }
  }

  const initCoreWebsockets = () => {
    websocketInstance = new WebSockets({
      beforeConnect() {
        let base = 'ws://127.0.0.1:20113'
        let bearer = ''

        const profile = profilesStore.getProfileById(appSettingsStore.app.kernel.profile)
        if (profile) {
          const controller = profile.advancedConfig['external-controller'] || '127.0.0.1:20113'
          const [, port = 20113] = controller.split(':')
          base = `ws://127.0.0.1:${port}`
          bearer = profile.advancedConfig.secret
        }
        this.base = base
        this.bearer = bearer
      },
    })

    const { connect: connectLongLived, disconnect: disconnectLongLived } =
      websocketInstance.createWS([
        {
          name: 'Memory',
          url: Api.Memory,
          cb: createCoreWSDispatcher(websocketHandlers.memory),
        },
        {
          name: 'Traffic',
          url: Api.Traffic,
          cb: createCoreWSDispatcher(websocketHandlers.traffic),
        },
        {
          name: 'Connections',
          url: Api.Connections,
          cb: createCoreWSDispatcher(websocketHandlers.connections),
        },
      ])

    const { connect: connectShortLived, disconnect: disconnectShortLived } =
      websocketInstance.createWS([
        {
          name: 'Logs',
          url: Api.Logs,
          params: { level: 'debug' },
          cb: createCoreWSDispatcher(websocketHandlers.logs),
        },
      ])

    longLivedWS.setup = () => {
      longLivedWS.timer = setIntervalImmediately(connectLongLived, 3_000)
    }
    longLivedWS.cleanup = () => {
      clearInterval(longLivedWS.timer)
      disconnectLongLived()
      longLivedWS.cleanup = undefined
    }

    shortLivedWS.setup = () => {
      shortLivedWS.timer = setIntervalImmediately(connectShortLived, 3_000)
    }
    shortLivedWS.cleanup = () => {
      clearInterval(shortLivedWS.timer)
      disconnectShortLived()
      shortLivedWS.cleanup = undefined
    }

    onLogsEvents.onFirst = shortLivedWS.setup
    onLogsEvents.onEmpty = shortLivedWS.cleanup
  }

  const destroyCoreWebsockets = () => {
    longLivedWS.cleanup?.()
    shortLivedWS.cleanup?.()
    websocketInstance = null
  }

  /* Bridge API */
  const loading = ref(false)
  const statusLoading = ref(true)
  let doneFirstCoreUpdate: (value: unknown) => void
  const firstCoreUpdatePromise = new Promise((r) => (doneFirstCoreUpdate = r))

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

    doneFirstCoreUpdate(null)
  }

  const onCoreStarted = async (pid: number) => {
    appSettingsStore.app.kernel.pid = pid
    appSettingsStore.app.kernel.running = true
    await Promise.all([refreshConfig(), refreshProviderProxies()])
    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.setSystemProxy()
    }
    pluginsStore.onCoreStartedTrigger()
  }

  const onCoreStopped = debounce(async () => {
    appSettingsStore.app.kernel.pid = 0
    appSettingsStore.app.kernel.running = false
    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.clearSystemProxy()
    }
    pluginsStore.onCoreStoppedTrigger()
  }, 100)

  const startKernel = async () => {
    const { profile: profileID, branch } = appSettingsStore.app.kernel
    const profile = profilesStore.getProfileById(profileID)
    if (!profile) throw 'Choose a profile first'

    await stopKernel()

    const fileName = getKernelFileName(branch === 'alpha')
    const kernelFilePath = CoreWorkingDirectory + '/' + fileName

    loading.value = true

    try {
      await generateConfigFile(profile)
      const pid = await ExecBackground(
        kernelFilePath,
        ['-d', envStore.env.basePath + '/' + CoreWorkingDirectory],
        (out) => {
          logsStore.recordKernelLog(out)
          if (out.toLowerCase().includes(CoreStopOutputKeyword)) {
            loading.value = false
            onCoreStarted(pid)
          }
        },
        () => {
          loading.value = false
          onCoreStopped()
        },
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
    if (running) {
      await KillProcess(pid)
      await onCoreStopped()
    }

    logsStore.clearKernelLog()
  }

  const restartKernel = async (cleanupTask?: () => Promise<any>) => {
    await stopKernel()
    await cleanupTask?.()
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

  const _watchProxies = computed(() =>
    Object.values(proxies.value)
      .map((group) => group.name + group.now)
      .sort()
      .join(),
  )

  watch([() => config.value.mode, () => config.value.tun.enable, _watchProxies], updateTrayMenus)

  watch(
    () => appSettingsStore.app.kernel.running,
    async (v) => {
      await firstCoreUpdatePromise
      if (v) {
        initCoreWebsockets()
        longLivedWS.setup?.()
      } else {
        destroyCoreWebsockets()
      }
    },
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

    onLogs: createCoreWSHandlerRegister(websocketHandlers.logs, onLogsEvents),
    onMemory: createCoreWSHandlerRegister(websocketHandlers.memory),
    onTraffic: createCoreWSHandlerRegister(websocketHandlers.traffic),
    onConnections: createCoreWSHandlerRegister(websocketHandlers.connections),
  }
})
