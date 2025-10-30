import { useAppSettingsStore, useProfilesStore } from '@/stores'
import { Request } from '@/utils/request'

import type { CoreApiConfig, CoreApiProxies, CoreApiConnections } from '@/types/kernel'

export enum Api {
  Configs = '/configs',
  Memory = '/memory',
  Proxies = '/proxies',
  ProxyDelay = '/proxies/{0}/delay',
  Connections = '/connections',
  Traffic = '/traffic',
  Logs = '/logs',
  GEO = '/configs/geo',
}

const setupKernelApi = () => {
  const appSettingsStore = useAppSettingsStore()
  const profilesStore = useProfilesStore()

  const profile = profilesStore.getProfileById(appSettingsStore.app.kernel.profile)

  let base = 'http://127.0.0.1:20113'
  let bearer = ''

  if (profile) {
    const controller = profile.advancedConfig['external-controller'] || '127.0.0.1:20113'
    const [, port = 20113] = controller.split(':')
    // TODO: tls
    base = `http://127.0.0.1:${port}`
    bearer = profile.advancedConfig.secret
  }

  request.base = base
  request.bearer = bearer
}

const request = new Request({ beforeRequest: setupKernelApi, timeout: 60 * 1000 })

export const getConfigs = () => request.get<CoreApiConfig>(Api.Configs)

export const setConfigs = (body = {}) => request.patch<null>(Api.Configs, body)

export const getProxies = () => request.get<CoreApiProxies>(Api.Proxies)

export const getConnections = () => request.get<CoreApiConnections>(Api.Connections)

export const deleteConnection = (id: string) => request.delete<null>(Api.Connections + '/' + id)

export const deleteGroupFixed = (group: string) => request.delete(Api.Proxies + '/' + group)

export const useProxy = (group: string, proxy: string) => {
  return request.put<null>(Api.Proxies + '/' + group, { name: proxy })
}

export const getProxyDelay = (proxy: string, url: string) => {
  return request.get<Record<string, number>>(Api.ProxyDelay.replace('{0}', proxy), {
    url,
    timeout: 5000,
  })
}

export const updateGEO = () => request.post<{ message: string } | null>(Api.GEO)
