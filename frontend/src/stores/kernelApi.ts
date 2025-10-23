import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { getConfigs, setConfigs, getProxies, getProviders, Api } from '@/api/kernel'
import { ProcessInfo, KillProcess, ExecBackground, ReadFile, WriteFile, RemoveFile } from '@/bridge'
import { CorePidFilePath, CoreStopOutputKeyword, CoreWorkingDirectory } from '@/constant'
import { Branch } from '@/enums/app'
import {
  useAppSettingsStore,
  useProfilesStore,
  useLogsStore,
  useEnvStore,
  usePluginsStore,
} from '@/stores'
import {
  generateConfigFile,
  updateTrayMenus,
  getKernelFileName,
  WebSockets,
  setIntervalImmediately,
  message,
  getKernelRuntimeArgs,
  getKernelRuntimeEnv,
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
  const corePid = ref(-1)
  const running = ref(false)
  const starting = ref(false)
  const stopping = ref(false)
  const restarting = ref(false)
  const coreStateLoading = ref(true)
  let isCoreStartedByThisInstance = false
  let { promise: coreStoppedPromise, resolve: coreStoppedResolver } = Promise.withResolvers()

  const initCoreState = async () => {
    corePid.value = Number(await ReadFile(CorePidFilePath).catch(() => -1))
    const processName = corePid.value === -1 ? '' : await ProcessInfo(corePid.value).catch(() => '')
    running.value = processName.startsWith('mihomo')

    coreStateLoading.value = false

    if (running.value) {
      initCoreWebsockets()
      longLivedWS.setup?.()
      await Promise.all([refreshConfig(), refreshProviderProxies()])
      await envStore.updateSystemProxyStatus()
    } else if (appSettingsStore.app.autoStartKernel) {
      await startCore()
    }
  }

  const runCoreProcess = (isAlpha: boolean) => {
    return new Promise<number | void>((resolve, reject) => {
      let output: string
      const pid = ExecBackground(
        CoreWorkingDirectory + '/' + getKernelFileName(isAlpha),
        getKernelRuntimeArgs(isAlpha),
        (out) => {
          output = out
          logsStore.recordKernelLog(out)
          if (out.includes(CoreStopOutputKeyword)) {
            resolve(pid)
          }
        },
        () => {
          onCoreStopped()
          reject(output)
        },
        { StopOutputKeyword: CoreStopOutputKeyword, Env: getKernelRuntimeEnv(isAlpha) },
      ).catch((e) => reject(e))
    })
  }

  const onCoreStarted = async (pid: number) => {
    await WriteFile(CorePidFilePath, String(pid))

    corePid.value = pid
    running.value = true
    isCoreStartedByThisInstance = true
    coreStoppedPromise = new Promise((r) => (coreStoppedResolver = r))

    initCoreWebsockets()
    longLivedWS.setup?.()
    await Promise.all([refreshConfig(), refreshProviderProxies()])

    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.setSystemProxy().catch((err) => message.error(err))
    }
    await envStore.updateSystemProxyStatus()

    await pluginsStore.onCoreStartedTrigger()
  }

  const onCoreStopped = async () => {
    await RemoveFile(CorePidFilePath)

    corePid.value = -1
    running.value = false

    destroyCoreWebsockets()

    if (appSettingsStore.app.autoSetSystemProxy) {
      await envStore.clearSystemProxy()
    }
    await pluginsStore.onCoreStoppedTrigger()

    coreStoppedResolver(null)
  }

  const startCore = async () => {
    if (running.value) throw 'The core is already running'

    logsStore.clearKernelLog()

    const { profile: profileID, branch } = appSettingsStore.app.kernel
    const profile = profilesStore.getProfileById(profileID)
    if (!profile) throw 'Choose a profile first'

    starting.value = true
    try {
      await generateConfigFile(profile, (config) =>
        pluginsStore.onBeforeCoreStartTrigger(config, profile),
      )
      const isAlpha = branch === Branch.Alpha
      const pid = await runCoreProcess(isAlpha)
      pid && (await onCoreStarted(pid))
    } finally {
      starting.value = false
    }
  }

  const stopCore = async () => {
    if (!running.value) throw 'The core is not running'

    stopping.value = true
    try {
      await pluginsStore.onBeforeCoreStopTrigger()
      await KillProcess(corePid.value)
      await (isCoreStartedByThisInstance ? coreStoppedPromise : onCoreStopped())
    } finally {
      stopping.value = false
    }
  }

  const restartCore = async (cleanupTask?: () => Promise<any>) => {
    restarting.value = true
    try {
      await stopCore()
      await cleanupTask?.()
      await startCore()
    } finally {
      restarting.value = false
    }
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

  const watchSources = computed(() => {
    const source = [config.value.mode, config.value.tun.enable]
    if (!appSettingsStore.app.addGroupToMenu) return source.join('')

    const { unAvailable, sortByDelay } = appSettingsStore.app.kernel

    const proxySignature = Object.values(proxies.value)
      .map((group) => group.name + group.now)
      .sort()
      .join()

    return source.concat([proxySignature, unAvailable, sortByDelay]).join('')
  })

  watch([watchSources, running], updateTrayMenus)

  return {
    startCore,
    stopCore,
    restartCore,
    initCoreState,
    pid: corePid,
    running,
    starting,
    stopping,
    restarting,
    coreStateLoading,
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

    // Deprecated
    startKernel: () => {
      console.warn('[Deprecated] "startKernel" is deprecated. Please use "startCore" instead.')
      startCore()
    },
    stopKernel: () => {
      console.warn('[Deprecated] "stopKernel" is deprecated. Please use "stopCore" instead.')
      stopCore()
    },
    restartKernel: (...args: any[]) => {
      console.warn('[Deprecated] "restartKernel" is deprecated. Please use "restartCore" instead.')
      restartCore(...args)
    },
  }
})
