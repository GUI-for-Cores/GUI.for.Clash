<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore } from '@/stores/appSettings'
import { Theme, Lang, WindowStartState, Color } from '@/constant/app'
import { CheckPermissions, SwitchPermissions } from '@/utils/bridge'
import { useMessage } from '@/hooks/useMessage'

const isAdmin = ref(false)

const { t } = useI18n()
const { message } = useMessage()
const appSettings = useAppSettingsStore()

const themes = [
  {
    label: 'settings.theme.dark',
    value: Theme.Dark
  },
  {
    label: 'settings.theme.light',
    value: Theme.Light
  },
  {
    label: 'settings.theme.auto',
    value: Theme.Auto
  }
]

const colors = [
  {
    label: 'settings.color.default',
    value: Color.Default
  },
  {
    label: 'settings.color.orange',
    value: Color.Orange
  },
  {
    label: 'settings.color.pink',
    value: Color.Pink
  },
  {
    label: 'settings.color.skyblue',
    value: Color.Skyblue
  }
]

const langs = [
  {
    label: 'settings.lang.zh',
    value: Lang.ZH
  },
  {
    label: 'settings.lang.en',
    value: Lang.EN
  }
]

const windowStates = [
  { label: 'settings.windowState.normal', value: WindowStartState.Normal },
  // { label: 'settings.windowState.maximised', value: WindowStartState.Maximised },
  { label: 'settings.windowState.minimised', value: WindowStartState.Minimised }
  // { label: 'settings.windowState.fullscreen', value: WindowStartState.Fullscreen }
]

const resetFontFamily = () => {
  appSettings.app['font-family'] = '"Microsoft Yahei", "Arial", sans-serif, "Twemoji Mozilla"'
}

CheckPermissions().then((admin) => {
  isAdmin.value = admin
})

const onPermChange = async (v: boolean) => {
  try {
    await SwitchPermissions(v)
    message.info('success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}
</script>

<template>
  <div class="settings">
    <div class="settings-item">
      <div class="title">
        {{ t('settings.theme.name') }}
      </div>
      <Radio v-model="appSettings.app.theme" :options="themes" />
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.color.name') }}
      </div>
      <Radio v-model="appSettings.app.color" :options="colors" />
    </div>
    <div class="settings-item">
      <div class="title">{{ t('settings.lang.name') }}</div>
      <Radio v-model="appSettings.app.lang" :options="langs" />
    </div>
    <div class="settings-item">
      <div class="title">{{ t('settings.fontFamily') }}</div>
      <div style="display: flex; align-items: center">
        <Button @click="resetFontFamily" v-tips="'settings.resetFont'" type="text">
          <Icon icon="reset" />
        </Button>
        <Input
          v-model="appSettings.app['font-family']"
          :delay="1000"
          editable
          style="margin-left: 8px"
        />
      </div>
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.disableResize') }}
        <span class="tips">({{ t('settings.needRestart') }})</span>
      </div>
      <Switch v-model="appSettings.app.disableResize" />
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.exitOnClose') }}
      </div>
      <Switch v-model="appSettings.app.exitOnClose" />
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.closeKernelOnExit') }}
      </div>
      <Switch v-model="appSettings.app.closeKernelOnExit" />
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.windowState.name') }}
        <span class="tips">({{ t('settings.needRestart') }})</span>
      </div>
      <Radio v-model="appSettings.app.windowStartState" :options="windowStates" type="number" />
    </div>
    <div class="settings-item">
      <div class="title">
        {{ t('settings.admin') }}
        <span class="tips">({{ t('settings.needRestart') }})</span>
      </div>
      <Switch v-model="isAdmin" @change="onPermChange" />
    </div>
  </div>
</template>

<style lang="less" scoped>
.settings {
  &-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 16px;
    .title {
      align-self: flex-start;
      font-size: 18px;
      font-weight: bold;
      padding: 8px 0 16px 0;
      .tips {
        font-weight: normal;
        font-size: 12px;
      }
    }
  }
}
</style>
