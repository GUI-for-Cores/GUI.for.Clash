import { Request } from '@/utils/request'
import { WebSockets } from '@/utils/websockets'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useProfilesStore } from '@/stores/profiles'
import type {
  KernelApiConfig,
  KernelApiProviders,
  KernelApiProxies,
  KernelApiConnections,
  KernelConnectionsWS
} from './kernel.schema'

enum Api {
  Configs = '/configs',
  Memory = '/memory',
  Proxies = '/proxies',
  Providers = '/providers/proxies',
  GroupDelay = '/group/{0}/delay',
  ProxyDelay = '/proxies/{0}/delay',
  Connections = '/connections',
  Traffic = '/traffic',
  Logs = '/logs',
  GEO = '/configs/geo',
  ProvidersRules = '/providers/rules'
}

const getCurrentProfile = () => {
  const appSettingsStore = useAppSettingsStore()
  const profilesStore = useProfilesStore()
  return profilesStore.getProfileByName(appSettingsStore.app.kernel.profile)
}

const setupKernelApi = () => {
  let base = 'http://127.0.0.1:9090'
  let bearer = ''

  const profile = getCurrentProfile()

  if (profile) {
    const controller = profile.advancedConfig['external-controller'] || '127.0.0.1:9090'
    // TODO: tls
    if (controller.startsWith(':')) {
      base = 'http://127.0.0.1' + controller
    } else {
      base = 'http://' + controller
    }
    bearer = profile.advancedConfig.secret
  }

  request.base = base
  request.bearer = bearer
}

const setupKernelWSApi = () => {
  let base = 'ws://127.0.0.1:9090'
  let bearer = ''

  const profile = getCurrentProfile()

  if (profile) {
    const controller = profile.advancedConfig['external-controller'] || '127.0.0.1:9090'
    if (controller.startsWith(':')) {
      base = 'ws://127.0.0.1' + controller
    } else {
      base = 'ws://' + controller
    }
    bearer = profile.advancedConfig.secret
  }

  websockets.base = base
  websockets.bearer = bearer
}

const request = new Request({ beforeRequest: setupKernelApi })

const websockets = new WebSockets({ beforeConnect: setupKernelWSApi })

export const getConfigs = () => request.get<KernelApiConfig>(Api.Configs)

export const setConfigs = (body = {}) => request.patch<null>(Api.Configs, body)

export const getProxies = () => request.get<KernelApiProxies>(Api.Proxies)

export const getProviders = () => request.get<KernelApiProviders>(Api.Providers)

export const getConnections = () => request.get<KernelApiConnections>(Api.Connections)

export const deleteConnection = (id: string) => request.delete<null>(Api.Connections + '/' + id)

export const useProxy = (group: string, proxy: string) => {
  return request.put<null>(Api.Proxies + '/' + group, { name: proxy })
}

export const getGroupDelay = (group: string) => {
  return request.get<Record<string, number>>(Api.GroupDelay.replace('{0}', group), {
    url: 'https://www.gstatic.com/generate_204',
    timeout: 5000
  })
}

export const getProxyDelay = (proxy: string) => {
  return request.get<Record<string, number>>(Api.ProxyDelay.replace('{0}', proxy), {
    url: 'https://www.gstatic.com/generate_204',
    timeout: 5000
  })
}

export const updateGEO = () => request.post<{ message: string } | null>(Api.GEO)

export const updateProvidersRules = (ruleset: string) => {
  return request.put<null>(Api.ProvidersRules + '/' + ruleset)
}

export const updateProvidersProxies = (provider: string) => {
  return request.put<null>(Api.Providers + '/' + provider)
}

type KernelWSOptions = {
  onConnections: (data: any) => void
  onTraffic: (data: any) => void
  onMemory: (data: any) => void
}

export const getKernelWS = ({ onConnections, onTraffic, onMemory }: KernelWSOptions) => {
  return websockets.connect([
    { name: 'Connections', url: Api.Connections, cb: onConnections },
    { name: 'Traffic', url: Api.Traffic, cb: onTraffic },
    { name: 'Memory', url: Api.Memory, cb: onMemory }
  ])
}

export const getKernelLogsWS = (onLogs: (data: any) => void) => {
  return websockets.connect([
    { name: 'Logs', url: Api.Logs, cb: onLogs, params: { level: 'debug' } }
  ])
}

export const getKernelConnectionsWS = (onConnections: (data: KernelConnectionsWS) => void) => {
  return websockets.connect([{ name: 'Connections', url: Api.Connections, cb: onConnections }])
}
