import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import {
  getConfigs,
  setConfigs,
  getProxies,
  onLogs,
  onMemory,
  onTraffic,
  onConnections,
  connectWebsocket,
  disconnectWebsocket,
} from '@/api/kernel'
import { ProcessInfo, KillProcess, ExecBackground, ReadFile, WriteFile, RemoveFile } from '@/bridge'
import { CorePidFilePath, CoreStopOutputKeyword, CoreWorkingDirectory } from '@/constant/kernel'
import { Branch } from '@/enums/app'
import { RuleType } from '@/enums/kernel'
import {
  useAppSettingsStore,
  useProfilesStore,
  useLogsStore,
  useEnvStore,
  usePluginsStore,
  useSubscribesStore,
  useRulesetsStore,
} from '@/stores'
import {
  generateConfigFile,
  updateTrayMenus,
  getKernelFileName,
  message,
  getKernelRuntimeArgs,
  getKernelRuntimeEnv,
  eventBus,
} from '@/utils'

import type { CoreApiConfig, CoreApiProxy } from '@/types/kernel'

export type ProxyType = 'mixed' | 'http' | 'socks'

export const useKernelApiStore = defineStore('kernelApi', () => {
  const envStore = useEnvStore()
  const logsStore = useLogsStore()
  const pluginsStore = usePluginsStore()
  const profilesStore = useProfilesStore()
  const subscribesStore = useSubscribesStore()
  const rulesetsStore = useRulesetsStore()
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
      stack: '',
      device: '',
    },
  })

  const proxies = ref<Record<string, CoreApiProxy>>({})

  const refreshConfig = async () => {
    config.value = await getConfigs()
  }

  const updateConfig = async (options: Record<string, any>) => {
    await setConfigs(options)
    await refreshConfig()
  }

  const refreshProviderProxies = async () => {
    const { proxies: b } = await getProxies()
    proxies.value = b
  }

  /* Bridge API */
  const corePid = ref(-1)
  const running = ref(false)
  const starting = ref(false)
  const stopping = ref(false)
  const restarting = ref(false)
  const needRestart = ref(false)
  const coreStateLoading = ref(true)
  let isCoreStartedByThisInstance = false
  let { promise: coreStoppedPromise, resolve: coreStoppedResolver } = Promise.withResolvers()

  const initCoreState = async () => {
    corePid.value = Number(await ReadFile(CorePidFilePath).catch(() => -1))
    const processName = corePid.value === -1 ? '' : await ProcessInfo(corePid.value).catch(() => '')
    running.value = processName.startsWith('mihomo')

    coreStateLoading.value = false

    if (running.value) {
      connectWebsocket()
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
    needRestart.value = false
    isCoreStartedByThisInstance = true
    coreStoppedPromise = new Promise((r) => (coreStoppedResolver = r))

    connectWebsocket()
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
    needRestart.value = false

    disconnectWebsocket()

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
      needRestart.value = false
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

  eventBus.on('profileChange', ({ id }) => {
    if (running.value && id === appSettingsStore.app.kernel.profile) {
      needRestart.value = true
    }
  })

  eventBus.on('subscriptionChange', ({ id }) => {
    if (running.value && profilesStore.currentProfile) {
      const inUse = profilesStore.currentProfile.proxyGroupsConfig.some(
        (group) => group.use.includes(id) || group.proxies.some((proxy) => proxy.type === id),
      )
      if (inUse) {
        needRestart.value = true
      }
    }
  })

  eventBus.on('subscriptionsChange', () => {
    if (running.value && profilesStore.currentProfile) {
      const enabledSubs = subscribesStore.subscribes.flatMap((v) => (v.disabled ? [] : v.id))
      const inUse = profilesStore.currentProfile.proxyGroupsConfig.some(
        (group) =>
          group.use.some((sub) => enabledSubs.includes(sub)) ||
          group.proxies.some((proxy) => enabledSubs.includes(proxy.type)),
      )
      if (inUse) {
        needRestart.value = true
      }
    }
  })

  const collectRulesetIDs = () => {
    if (!profilesStore.currentProfile) return []
    const l1 = Object.keys(profilesStore.currentProfile.dnsConfig['nameserver-policy']).flatMap(
      (v) => (v.startsWith('rule-set:') ? v.slice('rule-set:'.length) : []),
    )
    const l2 = profilesStore.currentProfile.rulesConfig.flatMap((v) =>
      v.type === RuleType.RuleSet ? v.payload : [],
    )
    return [...l1, ...l2]
  }

  eventBus.on('rulesetChange', ({ id }) => {
    if (running.value && profilesStore.currentProfile) {
      const inUse = collectRulesetIDs().includes(id)
      if (inUse) {
        needRestart.value = true
      }
    }
  })

  eventBus.on('rulesetsChange', () => {
    if (running.value && profilesStore.currentProfile) {
      const enabledRulesets = rulesetsStore.rulesets.flatMap((v) => (v.disabled ? [] : v.id))
      const inUse = collectRulesetIDs().some((v) => enabledRulesets.includes(v))
      if (inUse) {
        needRestart.value = true
      }
    }
  })

  watch(needRestart, (v) => {
    if (v && appSettingsStore.app.autoRestartKernel) {
      restartCore()
    }
  })

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
    needRestart,
    coreStateLoading,
    config,
    proxies,
    refreshConfig,
    updateConfig,
    refreshProviderProxies,
    getProxyPort,

    onLogs,
    onMemory,
    onTraffic,
    onConnections,
  }
})
