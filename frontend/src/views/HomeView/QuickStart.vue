<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMessage } from '@/hooks'
import * as Defaults from '@/constant'
import { sampleID, APP_TITLE, APP_VERSION } from '@/utils'
import {
  useProfilesStore,
  useAppSettingsStore,
  useSubscribesStore,
  type SubscribeType,
  type ProfileType
} from '@/stores'

const url = ref('')
const loading = ref(false)

const { t } = useI18n()
const { message } = useMessage()
const subscribeStore = useSubscribesStore()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  if (!url.value || !url.value.toLocaleLowerCase().startsWith('http')) return

  const profileID = sampleID()
  const subscribeID = sampleID()

  const ids = [sampleID(), sampleID(), sampleID(), sampleID(), sampleID()]

  const profile: ProfileType = {
    id: profileID,
    name: profileID,
    generalConfig: Defaults.GeneralConfigDefaults,
    advancedConfig: Defaults.AdvancedConfigDefaults(),
    tunConfig: Defaults.TunConfigDefaults,
    dnsConfig: Defaults.DnsConfigDefaults,
    proxyGroupsConfig: Defaults.ProxyGroupsConfigDefaults(ids),
    rulesConfig: Defaults.RulesConfigDefaults(ids)
  }

  profile.proxyGroupsConfig[0].use = [subscribeID]
  profile.proxyGroupsConfig[1].use = [subscribeID]

  const subscribe: SubscribeType = {
    id: subscribeID,
    name: subscribeID,
    url: url.value,
    upload: 0,
    download: 0,
    total: 0,
    expire: '',
    updateTime: '',
    type: 'Http',
    website: '',
    path: `data/subscribes/${subscribeID}.yaml`,
    include: '',
    exclude: '',
    proxyPrefix: '',
    disabled: false,
    userAgent: APP_TITLE + '/' + APP_VERSION,
    healthCheck: {
      enable: true,
      url: 'https://www.gstatic.com/generate_204',
      interval: 300
    },
    proxies: []
  }

  loading.value = true

  try {
    await subscribeStore.addSubscribe(subscribe)

    await profilesStore.addProfile(profile)

    appSettingsStore.app.kernel.profile = profile.name
  } catch (error: any) {
    console.log(error)
    message.info(error)
    return
  }

  message.info('home.initSuccessful')

  try {
    await subscribeStore.updateSubscribe(subscribe.id)
  } catch (error: any) {
    console.log(error)
    message.info(error, 10)
    message.info('home.initFailed', 10)
  }

  loading.value = false

  handleCancel()
}
</script>

<template>
  <div class="form-item">
    <div class="name">* {{ t('subscribe.url') }}</div>
    <Input v-model="url" auto-size placeholder="http(s)://" autofocus style="width: 86%" />
  </div>

  <div class="action">
    <Button @click="handleCancel" :disable="loading">{{ t('common.cancel') }}</Button>
    <Button @click="handleSubmit" :loading="loading" type="primary">{{ t('common.save') }}</Button>
  </div>
</template>

<style lang="less" scoped>
.action {
  display: flex;
  justify-content: flex-end;
}
</style>
