<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from '@/hooks/useMessage'
import { sampleID } from '@/utils'
import { APP_TITLE } from '@/utils/env'
import * as Defaults from '@/constant/profile'
import {
  useProfilesStore,
  useAppSettingsStore,
  useSubscribesStore,
  type SubscribeType,
  type ProfileType
} from '@/stores'

const url = ref('')
const showModal = ref(false)

const { t } = useI18n()
const { message } = useMessage()
const subscribeStore = useSubscribesStore()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const handleCancel = () => (showModal.value = false)

const handleSubmit = async () => {
  if (!url.value || !url.value.toLocaleLowerCase().startsWith('http')) return

  const profile: ProfileType = {
    id: sampleID(),
    name: 'Default',
    generalConfig: Defaults.GeneralConfigDefaults,
    advancedConfig: Defaults.AdvancedConfigDefaults,
    tunConfig: Defaults.TunConfigDefaults,
    dnsConfig: Defaults.DnsConfigDefaults,
    proxyGroupsConfig: Defaults.ProxyGroupsConfigDefaults,
    rulesConfig: Defaults.RulesConfigDefaults
  }

  const subscribe: SubscribeType = {
    id: sampleID(),
    name: 'Default',
    url: url.value,
    upload: 0,
    download: 0,
    total: 0,
    expire: '',
    updateTime: '',
    type: 'Http',
    website: '',
    path: 'data/subscribes/default.yaml',
    include: '',
    exclude: '',
    disabled: false,
    proxies: []
  }

  try {
    await subscribeStore.addSubscribe(subscribe)

    await profilesStore.addProfile(profile)

    appSettingsStore.app.kernel.profile = profile.name

    await subscribeStore.updateSubscribe(subscribe.id)
  } catch (error: any) {
    console.log(error)
    message.info(error)
    return
  }

  handleCancel()
}
</script>

<template>
  <div class="quick-start">
    <img src="@/assets/logo.png" draggable="false" />
    <p>{{ t('home.noProfile', [APP_TITLE]) }}</p>
    <Button @click="showModal = true" type="primary">
      {{ t('home.quickStart') }}
    </Button>
  </div>

  <Modal v-model:open="showModal" :title="t('subscribes.enterLink')" :footer="false">
    <div class="form-item">
      <div class="name">* {{ t('subscribe.url') }}</div>
      <Input v-model="url" auto-size placeholder="http(s)://" autofocus style="width: 90%" />
    </div>

    <div class="action">
      <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
      <Button @click="handleSubmit" type="primary">{{ t('common.save') }}</Button>
    </div>
  </Modal>
</template>

<style lang="less" scoped>
.quick-start {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.form-item {
  margin-bottom: 8px;
  .name {
    font-size: 14px;
    padding: 8px 0;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
}
</style>
