import type { ProfileType } from '@/stores'

export const migrateProfiles = async (profiles: ProfileType[], save: () => Promise<string>) => {
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
  })

  if (needSync) await save()
}
