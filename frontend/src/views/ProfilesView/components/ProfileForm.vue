<script setup lang="ts">
import { ref, inject, type Ref, computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { WindowToggleMaximise } from '@/bridge'
import * as Defaults from '@/constant/profile'
import { useBool } from '@/hooks'
import { type ProfileType, useProfilesStore } from '@/stores'
import { deepClone, generateConfig, sampleID, stringifyNoFolding, message, alert } from '@/utils'

import AdvancedConfig from './AdvancedConfig.vue'
import DnsConfig from './DnsConfig.vue'
import GeneralConfig from './GeneralConfig.vue'
import MixinAndScript from './MixinAndScriptConfig.vue'
import ProxyGroupsConfig from './ProxyGroupsConfig.vue'
import RulesConfig from './RulesConfig.vue'
import TunConfig from './TunConfig.vue'

interface Props {
  id?: string
  step?: number
  isUpdate?: boolean
}

enum StepEnum {
  NAME = 0,
  GENERAL = 1,
  TUN = 2,
  DNS = 3,
  GROUPS = 4,
  RULES = 5,
  MIXIN_SCRIPT = 6,
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false,
  step: StepEnum.NAME,
})

const loading = ref(false)
const groupsRef = useTemplateRef<typeof ProxyGroupsConfig>('groupsRef')
const rulesRef = useTemplateRef<typeof RulesConfig>('rulesRef')
const currentStep = ref(props.step)

const stepItems = [
  { title: 'profile.step.name' },
  { title: 'profile.step.general' },
  { title: 'profile.step.tun' },
  { title: 'profile.step.dns' },
  { title: 'profile.step.groups' },
  { title: 'profile.step.rules' },
  { title: 'profile.step.mixin-script' },
]

const ids = [sampleID(), sampleID(), sampleID(), sampleID(), sampleID()]

const profile = ref<ProfileType>({
  id: sampleID(),
  name: '',
  generalConfig: Defaults.GeneralConfigDefaults(),
  advancedConfig: Defaults.AdvancedConfigDefaults(),
  tunConfig: Defaults.TunConfigDefaults(),
  dnsConfig: Defaults.DnsConfigDefaults(),
  proxyGroupsConfig: Defaults.ProxyGroupsConfigDefaults(ids),
  rulesConfig: Defaults.RulesConfigDefaults(ids),
  mixinConfig: Defaults.MixinConfigDefaults(),
  scriptConfig: Defaults.ScriptConfigDefaults(),
})

const mixinAndScriptConfig = computed({
  get() {
    return { mixin: profile.value.mixinConfig, script: profile.value.scriptConfig }
  },
  set({ mixin, script }) {
    profile.value.mixinConfig = mixin
    profile.value.scriptConfig = script
  },
})

const { t } = useI18n()
const profilesStore = useProfilesStore()
const [showAdvancedSetting, toggleAdvancedSetting] = useBool(false)

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any
const handlePrevStep = () => currentStep.value--
const handleNextStep = () => currentStep.value++

const handleSave = async () => {
  loading.value = true
  try {
    if (props.isUpdate) {
      await profilesStore.editProfile(props.id, profile.value)
      handleSubmit()
    } else {
      await profilesStore.addProfile(profile.value)
      handleCancel()
    }
  } catch (error: any) {
    console.error('handleSave: ', error)
    message.error(error)
  }
  loading.value = false
}

const handleAdd = () => {
  const map: Record<number, Ref> = {
    [StepEnum.GROUPS]: groupsRef,
    [StepEnum.RULES]: rulesRef,
  }
  map[currentStep.value].value.handleAdd()
}

const handlePreview = async () => {
  try {
    const config = await generateConfig(profile.value)
    alert(profile.value.name, stringifyNoFolding(config))
  } catch (error: any) {
    message.error(error.message || error)
  }
}

if (props.isUpdate) {
  const p = profilesStore.getProfileById(props.id)
  if (p) {
    profile.value = deepClone(p)
  }
}
</script>

<template>
  <div @dblclick="WindowToggleMaximise" class="header" style="--wails-draggable: drag">
    <div class="header-title">
      {{ t(stepItems[currentStep].title) }} ({{ currentStep + 1 }} / {{ stepItems.length }})
    </div>
    <Button
      v-show="currentStep !== StepEnum.NAME"
      @click="handlePreview"
      icon="file"
      type="text"
      class="ml-auto"
    />
    <Button
      v-show="[StepEnum.GROUPS, StepEnum.RULES].includes(currentStep)"
      @click="handleAdd"
      icon="add"
      type="text"
      class="mr-8"
    />
  </div>

  <div class="form">
    <div v-show="currentStep === StepEnum.NAME">
      <div class="form-item">
        <div class="name">{{ t('profile.name') }} *</div>
        <Input v-model="profile.name" auto-size autofocus class="flex-1 ml-8" />
      </div>
    </div>

    <div v-show="currentStep === StepEnum.GENERAL">
      <GeneralConfig v-model="profile.generalConfig" />
      <Divider>
        <Button type="text" size="small" @click="toggleAdvancedSetting">
          {{ t('profile.advancedSettings') }}
        </Button>
      </Divider>
      <div v-if="showAdvancedSetting">
        <AdvancedConfig v-model="profile.advancedConfig" :profile="profile" />
      </div>
    </div>

    <div v-show="currentStep === StepEnum.TUN">
      <TunConfig v-model="profile.tunConfig" />
    </div>

    <div v-show="currentStep === StepEnum.DNS">
      <DnsConfig v-model="profile.dnsConfig" />
    </div>

    <div v-show="currentStep === StepEnum.GROUPS">
      <ProxyGroupsConfig ref="groupsRef" v-model="profile.proxyGroupsConfig" />
    </div>

    <div v-show="currentStep === StepEnum.RULES">
      <RulesConfig
        ref="rulesRef"
        v-model="profile.rulesConfig"
        :proxy-groups="profile.proxyGroupsConfig"
        :profile="profile"
      />
    </div>

    <div v-show="currentStep === StepEnum.MIXIN_SCRIPT">
      <MixinAndScript v-model="mixinAndScriptConfig" />
    </div>
  </div>

  <div class="form-action">
    <Button @click="handlePrevStep" :disabled="currentStep == StepEnum.NAME" type="text">
      {{ t('common.prevStep') }}
    </Button>
    <Button
      @click="handleNextStep"
      :disabled="!profile.name || currentStep == stepItems.length - 1"
      type="text"
      class="mr-auto"
    >
      {{ t('common.nextStep') }}
    </Button>
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button @click="handleSave" :loading="loading" :disabled="!profile.name" type="primary">
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  margin-top: 8px;
  &-title {
    font-size: 20px;
    font-weight: bold;
    margin: 8px 0 16px 0;
  }
}
.form {
  padding-right: 8px;
  overflow-y: auto;
  max-height: calc(70vh - 8px);
}
</style>
