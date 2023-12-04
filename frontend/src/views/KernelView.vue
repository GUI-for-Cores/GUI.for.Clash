<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Download,
  UnzipZIPFile,
  HttpGetJSON,
  HttpGet,
  Exec,
  Movefile,
  Removefile
} from '@/utils/bridge'
import { KernelWorkDirectory, KernelFilePath, KernelAlphaFilePath } from '@/constant/kernel'
import { useMessage } from '@/hooks/useMessage'
import { useAppSettingsStore } from '@/stores'

const releaseUrl = 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest'
const alphaUrl = 'https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha'
const alphaVersionUrl =
  'https://github.com/MetaCubeX/mihomo/releases/download/Prerelease-Alpha/version.txt'

const loading = ref([false, false])
const downloadLoading = ref([false, false])
const getLocalVersionLoading = ref([false, false])
const getRemoteVersionLoading = ref([false, false])
const localVersion = ref(['', ''])
const remoteVersion = ref(['', ''])
const versionDetail = ref(['', ''])

const needUpdates = computed(() => [
  remoteVersion.value[0] && localVersion.value[0] !== remoteVersion.value[0],
  remoteVersion.value[1] && localVersion.value[1] !== remoteVersion.value[1]
])

const { t } = useI18n()
const { message } = useMessage()
const appSettings = useAppSettingsStore()

const downloadCore = async () => {
  downloadLoading.value[0] = true
  try {
    const { json } = await HttpGetJSON(releaseUrl)
    const { assets, tag_name } = json

    const asset = assets.find((v: any) => v.name === `mihomo-windows-amd64-${tag_name}.zip`)
    if (!asset) throw 'Asset Not Found'

    const path = KernelWorkDirectory + `/${tag_name}.zip`

    await Download(asset.browser_download_url, path)

    await Movefile(KernelFilePath, KernelFilePath + '.bak')

    await UnzipZIPFile(path, KernelWorkDirectory)

    await Removefile(path)

    message.info('Download Successful')
  } catch (error: any) {
    console.log(error)
    message.info(error)
  }
  downloadLoading.value[0] = false

  updateLocalVersion()
}

const downloadAlphaCore = async () => {
  downloadLoading.value[1] = true
  try {
    const { json } = await HttpGetJSON(alphaUrl)
    const { assets } = json

    const asset = assets.find((v: any) => v.name.includes(`mihomo-windows-amd64-alpha`))
    if (!asset) throw 'Asset Not Found'

    const path = KernelWorkDirectory + `/alpha.zip`

    await Download(asset.browser_download_url, path)

    await Movefile(KernelAlphaFilePath, KernelAlphaFilePath + '.bak')

    await UnzipZIPFile(path, './data')

    await Movefile('./data/mihomo-windows-amd64.exe', KernelAlphaFilePath)

    await Removefile(path)

    message.info('Download Successful')
  } catch (error: any) {
    console.log(error)
    message.info(error)
  }
  downloadLoading.value[1] = false

  updateAlphaLocalVersion()
}

const getLocalVersion = async () => {
  getLocalVersionLoading.value[0] = true
  try {
    const res = await Exec(KernelFilePath, '-v')
    versionDetail.value[0] = res.trim()
    return res.trim().match(/v\S+/)?.[0].trim() || ''
  } catch (error) {
    console.log(error)
  } finally {
    getLocalVersionLoading.value[0] = false
  }
  return ''
}

const getAlphaLocalVersion = async () => {
  getLocalVersionLoading.value[1] = true
  try {
    const res = await Exec(KernelAlphaFilePath, '-v')
    versionDetail.value[1] = res.trim()
    return (
      res
        .trim()
        .match(/alpha\S+/)?.[0]
        .trim() || ''
    )
  } catch (error) {
    console.log(error)
  } finally {
    getLocalVersionLoading.value[1] = false
  }
  return ''
}

const getRemoteVersion = async () => {
  getRemoteVersionLoading.value[0] = true
  try {
    const { json } = await HttpGetJSON(releaseUrl)
    const { tag_name } = json
    return tag_name as string
  } catch (error) {
    console.log(error)
  } finally {
    getRemoteVersionLoading.value[0] = false
  }
  return ''
}

const getAlphaRemoteVersion = async () => {
  getRemoteVersionLoading.value[1] = true
  try {
    const { body } = await HttpGet(alphaVersionUrl)
    return body.trim()
  } catch (error) {
    console.log(error)
  } finally {
    getRemoteVersionLoading.value[1] = false
  }
  return ''
}

const updateLocalVersion = async () => {
  localVersion.value[0] = await getLocalVersion()
}

const updateAlphaLocalVersion = async () => {
  localVersion.value[1] = await getAlphaLocalVersion()
}

const updateRemoteVersion = async () => {
  remoteVersion.value[0] = await getRemoteVersion()
}

const updateAlphaRemoteVersion = async () => {
  remoteVersion.value[1] = await getAlphaRemoteVersion()
}

const initVersion = async () => {
  loading.value = [true, true]

  try {
    const lv = await getLocalVersion()
    const lv_alpha = await getAlphaLocalVersion()

    localVersion.value[0] = lv
    localVersion.value[1] = lv_alpha
  } catch (error: any) {
    console.log(error)
  }

  try {
    const rv = await getRemoteVersion()
    const rv_alpha = await getAlphaRemoteVersion()

    remoteVersion.value[0] = rv
    remoteVersion.value[1] = rv_alpha
  } catch (error: any) {
    console.log(error)
  }

  loading.value = [false, false]
}

initVersion()
</script>

<template>
  <div class="kernel">
    <div class="item">
      <h3>{{ t('kernel.name') }}</h3>
      <Tag @click="updateLocalVersion" style="cursor: pointer">
        {{ t('kernel.local') }}
        :
        {{ getLocalVersionLoading[0] ? 'Loading' : localVersion[0] || t('kernel.notFound') }}
      </Tag>
      <Tag @click="updateRemoteVersion" style="cursor: pointer">
        {{ t('kernel.remote') }}
        :
        {{ getRemoteVersionLoading[0] ? 'Loading' : remoteVersion[0] || t('kernel.requestFailed') }}
      </Tag>
      <Button
        v-show="needUpdates[0]"
        @click="downloadCore"
        :loading="downloadLoading[0]"
        type="primary"
      >
        {{ t('kernel.update') }} : {{ remoteVersion[0] }}
      </Button>
      <div class="detail">
        {{ versionDetail[0] }}
      </div>
    </div>

    <div class="item">
      <h3>Alpha</h3>
      <Tag @click="updateAlphaLocalVersion" style="cursor: pointer">
        {{ t('kernel.local') }}
        :
        {{ getLocalVersionLoading[1] ? 'Loading' : localVersion[1] || t('kernel.notFound') }}
      </Tag>
      <Tag @click="updateAlphaRemoteVersion" style="cursor: pointer">
        {{ t('kernel.remote') }}
        :
        {{ getRemoteVersionLoading[1] ? 'Loading' : remoteVersion[1] || t('kernel.requestFailed') }}
      </Tag>
      <Button
        v-show="needUpdates[1]"
        @click="downloadAlphaCore"
        :loading="downloadLoading[1]"
        type="primary"
      >
        {{ t('kernel.update') }} : {{ remoteVersion[1] }}
      </Button>
      <div class="detail">
        {{ versionDetail[1] }}
      </div>
    </div>

    <div class="item">
      <h3>{{ t('settings.kernel.whichOne') }}</h3>
      <div class="branch">
        <Card
          :selected="appSettings.app.kernel.branch === 'main'"
          @click="appSettings.app.kernel.branch = 'main'"
          title="Main"
          class="branch-item"
        >
          {{ t('settings.kernel.main') }}
        </Card>
        <Card
          :selected="appSettings.app.kernel.branch === 'alpha'"
          @click="appSettings.app.kernel.branch = 'alpha'"
          title="Alpha"
          class="branch-item"
        >
          {{ t('settings.kernel.alpha') }}
        </Card>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.item {
  .detail {
    font-size: 12px;
    padding: 8px 4px;
  }
}

.branch {
  display: flex;
  &-item {
    width: 36%;
    margin-right: 8px;
    height: 70px;
    font-size: 12px;
  }
}
</style>
