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
  Removefile,
  GetEnv,
  Makedir
} from '@/utils/bridge'
import { KernelWorkDirectory, getKernelFileName } from '@/constant/kernel'
import { useMessage } from '@/hooks/useMessage'
import { useAppSettingsStore } from '@/stores'
import { ignoredError } from '@/utils'

const releaseUrl = 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest'
const alphaUrl = 'https://api.github.com/repos/MetaCubeX/mihomo/releases/tags/Prerelease-Alpha'
const alphaVersionUrl =
  'https://github.com/MetaCubeX/mihomo/releases/download/Prerelease-Alpha/version.txt'

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
    const { os, arch } = await GetEnv()

    const { assets, tag_name, message: msg } = json
    if (msg) throw msg

    const suffix = { windows: '.zip', linux: '.gz' }[os]
    const assetName = `mihomo-${os}-${arch}-${tag_name}${suffix}`

    const asset = assets.find((v: any) => v.name === assetName)
    if (!asset) throw 'Asset Not Found:' + assetName

    const tmp = `data/core${suffix}` // data/core.zip or data/core.gz

    await Makedir('data/mihomo')

    await Download(asset.browser_download_url, tmp)

    const fileName = await getKernelFileName()

    const kernelFilePath = KernelWorkDirectory + '/' + fileName

    await ignoredError(Movefile, kernelFilePath, kernelFilePath + '.bak')

    if (suffix === '.zip') {
      await UnzipZIPFile(tmp, KernelWorkDirectory)
    } else {
      // TODO: unzip gz
    }

    await Removefile(tmp)

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
    const { os, arch } = await GetEnv()

    const { assets, message: msg } = json
    if (msg) throw msg

    const suffix = { windows: '.zip', linux: '.gz' }[os]
    const assetName = `mihomo-${os}-${arch}-${remoteVersion.value[1]}${suffix}`

    const asset = assets.find((v: any) => v.name === assetName)
    if (!asset) throw 'Asset Not Found:' + assetName

    const tmp = `data/core-alpha${suffix}` // data/core-alpha.zip or data/core-alpha.gz

    await Makedir('data/mihomo')

    await Download(asset.browser_download_url, tmp)

    const fileName = await getKernelFileName() // mihomo-windows-amd64.exe
    const alphaFileName = await getKernelFileName(true) // mihomo-windows-amd64-alpha.exe

    const alphaKernelFilePath = KernelWorkDirectory + '/' + alphaFileName

    await ignoredError(Movefile, alphaKernelFilePath, alphaKernelFilePath + '.bak')

    if (suffix === '.zip') {
      await UnzipZIPFile(tmp, 'data')
    } else {
      // TODO: unzip gz
    }

    await Movefile('data/' + fileName, alphaKernelFilePath)

    await Removefile(tmp)

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
    const fileName = await getKernelFileName()
    const kernelFilePath = KernelWorkDirectory + '/' + fileName
    const res = await Exec(kernelFilePath, '-v')
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
    const fileName = await getKernelFileName(true)
    const kernelFilePath = KernelWorkDirectory + '/' + fileName
    const res = await Exec(kernelFilePath, '-v')
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

const getRemoteVersion = async (showTips = false) => {
  getRemoteVersionLoading.value[0] = true
  try {
    const { json } = await HttpGetJSON(releaseUrl)
    const { tag_name } = json
    return tag_name as string
  } catch (error: any) {
    console.log(error)
    showTips && message.info(error)
  } finally {
    getRemoteVersionLoading.value[0] = false
  }
  return ''
}

const getAlphaRemoteVersion = async (showTips = false) => {
  getRemoteVersionLoading.value[1] = true
  try {
    const { body } = await HttpGet(alphaVersionUrl)
    return body.trim()
  } catch (error: any) {
    console.log(error)
    showTips && message.info(error)
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

const updateRemoteVersion = async (showTips = false) => {
  remoteVersion.value[0] = await getRemoteVersion(showTips)
}

const updateAlphaRemoteVersion = async (showTips = false) => {
  remoteVersion.value[1] = await getAlphaRemoteVersion(showTips)
}

const initVersion = async () => {
  Promise.all([getLocalVersion(), getAlphaLocalVersion()])
    .then((versions) => {
      localVersion.value = versions
    })
    .catch((error: any) => {
      console.log(error)
    })

  Promise.all([getRemoteVersion(), getAlphaRemoteVersion()])
    .then((versions) => {
      remoteVersion.value = versions
    })
    .catch((error: any) => {
      console.log(error)
    })
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
      <Tag @click="updateRemoteVersion(true)" style="cursor: pointer">
        {{ t('kernel.remote') }}
        :
        {{ getRemoteVersionLoading[0] ? 'Loading' : remoteVersion[0] }}
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
      <Tag @click="updateAlphaRemoteVersion(true)" style="cursor: pointer">
        {{ t('kernel.remote') }}
        :
        {{ getRemoteVersionLoading[1] ? 'Loading' : remoteVersion[1] }}
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
