import { DefaultPluginHubSources } from '@/constant/app'
import { SnifferDefaults } from '@/constant/profile'
import { RequestProxyMode, WindowStartState } from '@/enums/app'
import { TunDnsMode, TunStack } from '@/enums/kernel'
import { useEnvStore } from '@/stores'

export const migrateAppSettings = async (
  settings: App.AppSettings,
  save: () => Promise<string>,
) => {
  let needSync = false

  const { os } = useEnvStore().env

  if ('darwinSystemProxyServices' in settings) {
    settings.systemProxyServices = settings.darwinSystemProxyServices as string[]
    delete settings.darwinSystemProxyServices
    needSync = true
  }
  if (
    !settings.systemProxyServices ||
    (os === 'linux' && settings.systemProxyServices.join(',') === 'Ethernet,Wi-Fi')
  ) {
    settings.systemProxyServices = os === 'darwin' ? ['Ethernet', 'Wi-Fi'] : []
    needSync = true
  }
  if (settings.autoSetSystemDNS === undefined) {
    settings.autoSetSystemDNS = false
    needSync = true
  }
  if (settings.systemProxyDNS === undefined) {
    settings.systemProxyDNS = ''
    needSync = true
  }
  if (settings.systemDefaultDNS === undefined) {
    settings.systemDefaultDNS = ''
    needSync = true
  }
  if (!settings.requestProxyMode) {
    settings.requestProxyMode = RequestProxyMode.System
    needSync = true
  }
  if (settings.customProxy === undefined) {
    settings.customProxy = ''
    needSync = true
  }
  if (settings.githubDownloadAcceleration === undefined) {
    settings.githubDownloadAcceleration = false
    needSync = true
  }
  if (settings.githubDownloadMirror === undefined) {
    settings.githubDownloadMirror = ''
    needSync = true
  }
  if (!settings.plugins) {
    settings.plugins = {
      sources: DefaultPluginHubSources(),
    }
    needSync = true
  }
  for (const source of settings.plugins.sources) {
    const name = ['generic', 'gfc', 'gfs'].find(
      (name) =>
        source.url ===
        `https://raw.githubusercontent.com/GUI-for-Cores/Plugin-Hub/main/plugins/${name}.json`,
    )
    if (name) {
      source.url = `https://api.github.com/repos/GUI-for-Cores/Plugin-Hub/contents/plugins/${name}.json?ref=main`
      needSync = true
    }
  }
  if (settings.debugUsePointer === undefined) {
    settings.debugUsePointer = false
    needSync = true
  }
  if (settings.debugModalSideBySide === undefined) {
    settings.debugModalSideBySide = false
    needSync = true
  }
  if (settings.systemTitleBar === undefined) {
    settings.systemTitleBar = false
    needSync = true
  }
  if (typeof settings.windowStartState === 'number') {
    settings.windowStartState =
      settings.windowStartState === 2 ? WindowStartState.Minimised : WindowStartState.Normal
    needSync = true
  }

  if (needSync) await save()
}

export const migrateProfiles = async (profiles: App.Profile[], save: () => Promise<string>) => {
  let needSync = false

  profiles.forEach((profile) => {
    profile.rulesConfig.forEach((rule) => {
      if (typeof rule.enable === 'undefined') {
        rule.enable = true
        needSync = true
      }
    })
    if (typeof profile.dnsConfig['fake-ip-range6'] === 'undefined') {
      profile.dnsConfig['fake-ip-range6'] = 'fc00::/18'
      needSync = true
    }
    if (typeof profile.dnsConfig['direct-nameserver'] === 'undefined') {
      profile.dnsConfig['direct-nameserver'] = []
      needSync = true
    }
    if (!profile.dnsConfig['proxy-server-nameserver']?.length) {
      profile.dnsConfig['proxy-server-nameserver'] = ['https://223.5.5.5/dns-query#DIRECT']
      needSync = true
    }
    if ('global-client-fingerprint' in profile.advancedConfig) {
      delete profile.advancedConfig['global-client-fingerprint']
      needSync = true
    }
    if (!profile.sniffer) {
      profile.sniffer = SnifferDefaults()
      profile.sniffer.enable = false
      needSync = true
    }
    if ((profile.tunConfig.stack as string) === 'mips') {
      profile.tunConfig.stack = TunStack.Mips
      needSync = true
    }
    if (typeof profile.tunConfig['dns-mode'] === 'undefined') {
      profile.tunConfig['dns-mode'] = TunDnsMode.Default
      needSync = true
    }
  })

  if (needSync) await save()
}

export const migrateSubscribes = async (
  subscribes: App.Subscription[],
  save: () => Promise<string>,
) => {
  let needSync = false

  subscribes.forEach((subscribe) => {
    if (typeof subscribe.requestProxyMode === 'undefined') {
      subscribe.requestProxyMode = RequestProxyMode.System
      needSync = true
    }
    if (typeof subscribe.customProxy === 'undefined') {
      subscribe.customProxy = ''
      needSync = true
    }
  })

  if (needSync) await save()
}
