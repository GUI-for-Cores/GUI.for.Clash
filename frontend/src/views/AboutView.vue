<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  APP_TITLE,
  APP_VERSION,
  PROJECT_URL,
  TG_GROUP,
  TG_CHANNEL,
  APP_VERSION_API
} from '@/utils/env'
import { Download, HttpGetJSON, BrowserOpenURL, Movefile, GetEnv } from '@/utils/bridge'
import { useMessage } from '@/hooks'

let downloadUrl = ''

const loading = ref(false)
const downloading = ref(false)
const needRestart = ref(false)
const remoteVersion = ref(APP_VERSION)
const needUpdate = computed(() => APP_VERSION !== remoteVersion.value)

const { t } = useI18n()
const { message } = useMessage()

const downloadApp = async () => {
  if (loading.value || downloading.value) return

  if (!needUpdate.value) {
    message.info(t('about.noNeedUpdate'))
    return
  }

  if (!downloadUrl) {
    message.info(t('about.noDownloadLink'))
    return
  }

  downloading.value = true

  try {
    const { appName } = await GetEnv()

    await Download(downloadUrl, appName + '.tmp')

    await Movefile(appName, appName + '_' + APP_VERSION + '.bak')

    await Movefile(appName + '.tmp', appName)

    needRestart.value = true
    message.info(t('about.updateSuccessful'))
  } catch (error: any) {
    console.log(error)
    message.info(error, 5)
  }

  downloading.value = false
}

const checkUpdate = async (showTips = false) => {
  if (loading.value || downloading.value) return

  loading.value = true

  try {
    const { json } = await HttpGetJSON(APP_VERSION_API)
    const { os, arch } = await GetEnv()

    const { tag_name, assets } = json
    const asset = assets.find((v: any) => v.name === `GUI.for.Clash-${os}-${arch}.exe`)
    if (asset) {
      remoteVersion.value = tag_name
      downloadUrl = asset.browser_download_url
    }

    if (showTips) {
      message.info(needUpdate.value ? t('about.newVersion') : t('about.latestVersion'))
    }
  } catch (error: any) {
    console.error(error)
    message.info(error)
  }

  loading.value = false
}

checkUpdate()
</script>

<template>
  <div class="about">
    <img src="@/assets/logo.png" draggable="false" />
    <div class="appname">{{ APP_TITLE }}</div>
    <div class="appver">
      <template v-if="needRestart">{{ t('about.restart') }}</template>
      <template v-else>
        <Button @click="checkUpdate(true)" :loading="loading" type="link" size="small">
          {{ APP_VERSION }}
        </Button>
        <Button v-if="needUpdate" @click="downloadApp" :loading="downloading" size="small">
          {{ t('about.new') }}: {{ remoteVersion }}
        </Button>
      </template>
    </div>
    <div @click="BrowserOpenURL(PROJECT_URL)" class="url"><Icon icon="github" />GitHub</div>
    <div @click="BrowserOpenURL(TG_GROUP)" class="url"><Icon icon="telegram" />Telegram Group</div>
    <div @click="BrowserOpenURL(TG_CHANNEL)" class="url">
      <Icon icon="telegram" />Telegram Channel
    </div>
  </div>
</template>

<style lang="less" scoped>
.about {
  padding: 22px 0 0 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .appname {
    font-weight: bold;
    font-size: 16px;
    padding: 8px 0;
  }
  .appver {
    font-size: 12px;
    margin-bottom: 12px;
  }
  .url {
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 12px;
    text-decoration: underline;
  }
}
</style>
