<script setup lang="ts">
import { ref, inject, type Ref, computed, useTemplateRef, h } from 'vue'
import { useI18n } from 'vue-i18n'

import * as Defaults from '@/constant/profile'
import { useBool } from '@/hooks'
import { type ProfileType, useProfilesStore } from '@/stores'
import { deepClone, generateConfig, sampleID, stringifyNoFolding, message, alert } from '@/utils'

import Button from '@/components/Button/index.vue'
import Dropdown from '@/components/Dropdown/index.vue'

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
}

enum Step {
  Name = 0,
  General = 1,
  Tun = 2,
  Dns = 3,
  Group = 4,
  Rules = 5,
  MixinScript = 6,
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false,
  step: Step.Name,
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

const ids = [sampleID(), sampleID(), sampleID(), sampleID(), sampleID()] as const

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
    if (props.id) {
      await profilesStore.editProfile(props.id, profile.value)
    } else {
      await profilesStore.addProfile(profile.value)
    }
    await handleSubmit()
  } catch (error: any) {
    console.error('handleSave: ', error)
    message.error(error)
  }
  loading.value = false
}

const handleAdd = () => {
  const map: Record<number, Ref> = {
    [Step.Group]: groupsRef,
    [Step.Rules]: rulesRef,
  }
  map[currentStep.value]!.value.handleAdd()
}

const handlePreview = async () => {
  try {
    const config = await generateConfig(profile.value)
    alert(profile.value.name, stringifyNoFolding(config))
  } catch (error: any) {
    message.error(error.message || error)
  }
}

if (props.id) {
  const p = profilesStore.getProfileById(props.id)
  if (p) {
    profile.value = deepClone(p)
  }
}

const modalSlots = {
  title: () =>
    h(
      Dropdown,
      {},
      {
        default: () =>
          h(
            'div',
            {
              class: 'font-bold',
            },
            `${t(stepItems[currentStep.value]!.title)} （${currentStep.value + 1} / ${stepItems.length}）`,
          ),
        overlay: () =>
          h(
            'div',
            {
              class: 'p-4 flex flex-col',
            },
            stepItems.map((step, index) =>
              h(
                Button,
                {
                  type: currentStep.value === index ? 'link' : 'text',
                  disabled: !profile.value.name && currentStep.value !== index,
                  onClick: () => (currentStep.value = index),
                },
                () => t(step.title),
              ),
            ),
          ),
      },
    ),

  toolbar: () => [
    h(Button, {
      type: 'text',
      icon: 'file',
      onClick: handlePreview,
    }),
    h(Button, {
      type: 'text',
      icon: 'add',
      style: {
        display: [Step.Group, Step.Rules].includes(currentStep.value) ? '' : 'none',
      },
      onClick: handleAdd,
    }),
  ],
  action: () => [
    h(
      Button,
      {
        disabled: currentStep.value === Step.Name,
        onClick: handlePrevStep,
      },
      () => t('common.prevStep'),
    ),
    h(
      Button,
      {
        class: 'mr-auto',
        disabled: !profile.value.name || currentStep.value === stepItems.length - 1,
        onClick: handleNextStep,
      },
      () => t('common.nextStep'),
    ),
  ],
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
        loading: loading.value,
        disabled: !profile.value.name,
        onClick: handleSave,
      },
      () => t('common.save'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <div>
    <div v-show="currentStep === Step.Name">
      <Input
        v-model="profile.name"
        autofocus
        :border="false"
        :placeholder="t('profile.name')"
        class="w-full"
      />
    </div>

    <div v-show="currentStep === Step.General">
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

    <div v-show="currentStep === Step.Tun">
      <TunConfig v-model="profile.tunConfig" />
    </div>

    <div v-show="currentStep === Step.Dns">
      <DnsConfig v-model="profile.dnsConfig" />
    </div>

    <div v-show="currentStep === Step.Group">
      <ProxyGroupsConfig ref="groupsRef" v-model="profile.proxyGroupsConfig" />
    </div>

    <div v-show="currentStep === Step.Rules">
      <RulesConfig
        ref="rulesRef"
        v-model="profile.rulesConfig"
        :proxy-groups="profile.proxyGroupsConfig"
        :profile="profile"
      />
    </div>

    <div v-show="currentStep === Step.MixinScript">
      <MixinAndScript v-model="mixinAndScriptConfig" />
    </div>
  </div>
</template>
