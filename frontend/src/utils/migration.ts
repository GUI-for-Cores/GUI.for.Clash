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
  })

  if (needSync) await save()
}
