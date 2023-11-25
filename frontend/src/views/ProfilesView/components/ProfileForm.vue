<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ProfileType, useProfilesStore, useAppSettingsStore } from '@/stores'
import { useMessage, useBool } from '@/hooks'
import * as Defaults from '@/constant/profile'
import { deepClone, sampleID } from '@/utils'
import GeneralConfig from '@/components/Profile/GeneralConfig.vue'
import AdvancedConfig from '@/components/Profile/AdvancedConfig.vue'
import TunConfig from '@/components/Profile/TunConfig.vue'
import DnsConfig from '@/components/Profile/DnsConfig.vue'
import ProxyGroupsConfig from '@/components/Profile/ProxyGroupsConfig.vue'
import RulesConfig from '@/components/Profile/RulesConfig.vue'

interface Props {
  id?: string
  isUpdate?: boolean
  step?: number
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false,
  step: 0
})

let oldProfileName = ''
const currentStep = ref(props.step)

const stepItems = [
  { title: 'profile.step.name' },
  { title: 'profile.step.general' },
  { title: 'profile.step.tun' },
  { title: 'profile.step.dns' },
  { title: 'profile.step.groups' },
  { title: 'profile.step.rules' }
]

const profile = ref<ProfileType>({
  id: sampleID(),
  name: '',
  generalConfig: Defaults.GeneralConfigDefaults,
  advancedConfig: Defaults.AdvancedConfigDefaults,
  tunConfig: Defaults.TunConfigDefaults,
  dnsConfig: Defaults.DnsConfigDefaults,
  proxyGroupsConfig: Defaults.ProxyGroupsConfigDefaults,
  rulesConfig: Defaults.RulesConfigDefaults
})

const { t } = useI18n()
const [showAdvancedSetting, toggleAdvancedSetting] = useBool(false)
const { message } = useMessage()
const profilesStore = useProfilesStore()
const appSettings = useAppSettingsStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  if (props.isUpdate) {
    try {
      await profilesStore.editProfile(props.id, profile.value)
      updateAppSettingsReferences(profile.value)
      handleCancel()
    } catch (error: any) {
      console.error('editProfile: ', error)
      message.info(error)
      return
    }
  } else {
    try {
      await profilesStore.addProfile(profile.value)
      handleCancel()
    } catch (error: any) {
      console.error('addProfile: ')
      message.info(error)
      return
    }
  }
  return
}

const updateAppSettingsReferences = (profile: ProfileType) => {
  if (oldProfileName && oldProfileName === appSettings.app.kernel.profile) {
    appSettings.app.kernel.profile = profile.name
  }
}

const handlePrevStep = () => {
  currentStep.value--
}

const handleNextStep = async () => {
  const { name } = profile.value

  if (!props.isUpdate && profilesStore.getProfileByName(name)) {
    message.info(name + ' ' + t('profile.alreadyExists'))
    return
  }

  currentStep.value++
}

if (props.isUpdate) {
  const p = profilesStore.getProfileById(props.id)
  if (p) {
    oldProfileName = p.name
    profile.value = deepClone(p)
  }
}
</script>

<template>
  <div class="title">{{ t(stepItems[currentStep].title) }}</div>

  <div v-show="currentStep === 0" class="step1">
    <div class="form-item">
      <div class="name">* {{ t('profile.name') }}</div>
      <Input v-model="profile.name" auto-size style="flex: 1; margin-left: 8px" />
    </div>
  </div>

  <div v-show="currentStep === 1" class="step2">
    <GeneralConfig v-model="profile.generalConfig" />
    <Divider>
      <Button type="text" @click="toggleAdvancedSetting">
        {{ t('profile.advancedSettings') }}
      </Button>
    </Divider>
    <div v-if="showAdvancedSetting">
      <AdvancedConfig v-model="profile.advancedConfig" />
    </div>
  </div>

  <div v-show="currentStep === 2" class="step3">
    <TunConfig v-model="profile.tunConfig" />
  </div>

  <div v-show="currentStep === 3" class="step4">
    <DnsConfig v-model="profile.dnsConfig" />
  </div>

  <div v-show="currentStep === 4" class="step5">
    <ProxyGroupsConfig v-model="profile.proxyGroupsConfig" />
  </div>

  <div v-show="currentStep === 5" class="setp6">
    <RulesConfig
      v-model="profile.rulesConfig"
      :proxy-groups="profile.proxyGroupsConfig"
      :profile="profile"
    />
  </div>

  <div class="action">
    <Button @click="handleCancel" type="text">{{ t('common.cancel') }}</Button>
    <Button @click="handlePrevStep" :disable="currentStep == 0" type="text">
      {{ t('common.prevStep') }}
    </Button>
    <Button
      @click="handleNextStep"
      :disable="!profile.name || currentStep == stepItems.length - 1"
      type="text"
    >
      {{ t('common.nextStep') }}
    </Button>
    <Button @click="handleSubmit" :disable="!profile.name" type="primary">
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.title {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 16px 0;
}
.action {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
