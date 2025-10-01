<script setup lang="ts">
import { h, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import * as Defaults from '@/constant'
import { DefaultSubscribeScript } from '@/constant/app'
import { RequestMethod } from '@/enums/app'
import {
  useProfilesStore,
  useAppSettingsStore,
  useSubscribesStore,
  type ProfileType,
} from '@/stores'
import { message, sampleID } from '@/utils'

import Button from '@/components/Button/index.vue'

import type { Subscription } from '@/types/app'

const url = ref('')
const name = ref('')
const loading = ref(false)

const { t } = useI18n()
const subscribeStore = useSubscribesStore()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any

const handleSave = async () => {
  const subscribeID = sampleID()

  if (!name.value) {
    name.value = sampleID()
  }

  const subscribe: Subscription = {
    id: subscribeID,
    name: name.value,
    useInternal: false,
    url: url.value,
    upload: 0,
    download: 0,
    total: 0,
    expire: 0,
    updateTime: 0,
    type: 'Http',
    website: '',
    path: `data/subscribes/${subscribeID}.yaml`,
    include: '',
    exclude: '',
    includeProtocol: '',
    excludeProtocol: '',
    proxyPrefix: '',
    disabled: false,
    inSecure: false,
    requestMethod: RequestMethod.Get,
    header: {
      request: {},
      response: {},
    },
    script: DefaultSubscribeScript,
    proxies: [],
  }

  loading.value = true

  try {
    await subscribeStore.addSubscribe(subscribe)
    await subscribeStore.updateSubscribe(subscribe.id)
  } catch (error: any) {
    loading.value = false
    console.log(error)
    message.error(error)
    subscribeStore.deleteSubscribe(subscribeID)
    return
  }

  const ids = [sampleID(), sampleID(), sampleID(), sampleID(), sampleID()]
  const profile: ProfileType = {
    id: sampleID(),
    name: name.value,
    generalConfig: Defaults.GeneralConfigDefaults(),
    advancedConfig: Defaults.AdvancedConfigDefaults(),
    tunConfig: Defaults.TunConfigDefaults(),
    dnsConfig: Defaults.DnsConfigDefaults(),
    proxyGroupsConfig: Defaults.ProxyGroupsConfigDefaults(ids),
    rulesConfig: Defaults.RulesConfigDefaults(ids),
    mixinConfig: Defaults.MixinConfigDefaults(),
    scriptConfig: Defaults.ScriptConfigDefaults(),
  }

  profile.proxyGroupsConfig[0].use = [subscribeID]
  profile.proxyGroupsConfig[1].use = [subscribeID]

  await profilesStore.addProfile(profile)

  appSettingsStore.app.kernel.profile = profile.id

  message.success('home.initSuccessful')

  loading.value = false

  handleSubmit()
}

const modalSlots = {
  cancel: () =>
    h(
      Button,
      {
        disabled: loading.value,
        onClick: handleCancel,
      },
      () => t('common.cancel'),
    ),
  submit: () =>
    h(
      Button,
      {
        type: 'primary',
        disabled: !/^https?:\/\//.test(url.value),
        loading: loading.value,
        onClick: handleSave,
      },
      () => t('common.save'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <div class="flex gap-4">
    <Input v-model="name" :placeholder="$t('profile.name')" auto-size clearable class="w-[25%]" />
    <Input v-model="url" placeholder="http(s)://" autofocus clearable class="w-[75%]" />
  </div>
</template>
