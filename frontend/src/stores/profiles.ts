import { ref } from 'vue'
import { defineStore } from 'pinia'
import { parse } from 'yaml'

import { Readfile, Writefile } from '@/bridge'
import { debounce, ignoredError, stringifyNoFolding } from '@/utils'
import {
  TunConfigDefaults,
  ProfilesFilePath,
  ProxyGroup,
  MixinConfigDefaults,
  ScriptConfigDefaults
} from '@/constant'

export type ProfileType = {
  id: string
  name: string
  generalConfig: {
    mode: string
    ipv6: boolean
    'mixed-port': number
    'allow-lan': boolean
    'log-level': string
    'interface-name': string
  }
  advancedConfig: {
    port: number
    'socks-port': number
    secret: string
    'external-controller': string
    'external-ui': string
    'keep-alive-interval': number
    'find-process-mode': string
    'external-controller-tls': string
    'external-ui-name': string
    'external-ui-url': string
    'unified-delay': boolean
    'tcp-concurrent': boolean
    authentication: string[]
    'skip-auth-prefixes': string[]
    tls: {
      certificate: string
      'private-key': string
    }
    'global-client-fingerprint': string
    'geodata-mode': boolean
    'geo-auto-update': boolean
    'geo-update-interval': number
    'geodata-loader': string
    'geosite-matcher': string
    'geox-url': {
      geoip: string
      geosite: string
      mmdb: string
      asn: string
    }
    'global-ua': string
    profile: {
      'store-selected'?: boolean
      'store-fake-ip'?: boolean
    }
    'lan-allowed-ips': string[]
    'lan-disallowed-ips': string[]
  }
  tunConfig: {
    enable: boolean
    stack: string
    'auto-route': boolean
    'route-address': string[]
    'auto-detect-interface': boolean
    'dns-hijack': string[]
    device: string
    mtu: number
    'strict-route': boolean
    'endpoint-independent-nat': boolean
  }
  dnsConfig: {
    enable: boolean
    listen: string
    'use-hosts': boolean
    'use-system-hosts': boolean
    ipv6: boolean
    'default-nameserver': string[]
    nameserver: string[]
    'enhanced-mode': string
    'fake-ip-range': string
    'fake-ip-filter': string[]
    'prefer-h3': boolean
    fallback: string[]
    'proxy-server-nameserver': string[]
    'nameserver-policy': {}
    'fallback-filter': {
      geoip: boolean
      'geoip-code': string
      geosite: string[]
      ipcidr: string[]
      domain: string[]
    }
    hosts: Record<string, string>
  }
  proxyGroupsConfig: {
    id: string
    name: string
    type: ProxyGroup
    proxies: {
      id: string
      type: string
      name: string
    }[]
    url: string
    interval: number
    strategy: string
    use: string[]
    tolerance: number
    lazy: boolean
    'disable-udp': boolean
    filter: string
    'exclude-filter': string
    hidden: boolean
    icon: string
  }[]
  rulesConfig: {
    id: string
    type: string
    payload: string
    proxy: string
    'no-resolve': boolean
  }[]
  mixinConfig: {
    priority: 'mixin' | 'gui'
    config: string
  }
  scriptConfig: {
    code: string
  }
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<ProfileType[]>([])

  const setupProfiles = async () => {
    const data = await ignoredError(Readfile, ProfilesFilePath)
    data && (profiles.value = parse(data))
    // compatibility code
    profiles.value.forEach((profile) => {
      profile.dnsConfig.hosts = profile.dnsConfig.hosts ?? {}
      profile.tunConfig['route-address'] =
        profile.tunConfig['route-address'] ?? TunConfigDefaults()['route-address']
      profile.mixinConfig = profile.mixinConfig ?? MixinConfigDefaults()
      profile.scriptConfig = profile.scriptConfig ?? ScriptConfigDefaults()
    })
  }

  const saveProfiles = debounce(async () => {
    await Writefile(ProfilesFilePath, stringifyNoFolding(profiles.value))
  }, 100)

  const addProfile = async (p: ProfileType) => {
    profiles.value.push(p)
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.pop()
      throw error
    }
  }

  const deleteProfile = async (id: string) => {
    const idx = profiles.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = profiles.value.splice(idx, 1)[0]
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.splice(idx, 0, backup)
      throw error
    }
  }

  const editProfile = async (id: string, p: ProfileType) => {
    const idx = profiles.value.findIndex((v) => v.id === id)
    if (idx === -1) return
    const backup = profiles.value.splice(idx, 1, p)[0]
    try {
      await saveProfiles()
    } catch (error) {
      profiles.value.splice(idx, 1, backup)
      throw error
    }
  }

  const getProfileById = (id: string) => profiles.value.find((v) => v.id === id)

  return {
    profiles,
    setupProfiles,
    saveProfiles,
    addProfile,
    editProfile,
    deleteProfile,
    getProfileById
  }
})
