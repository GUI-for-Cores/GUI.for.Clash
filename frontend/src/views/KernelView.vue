<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, UnzipZIPFile, HttpGetJSON, Exec } from '@/utils/bridge'
import { KernelWorkDirectory, KernelFilePath } from '@/constant/kernel'
import { useMessage } from '@/hooks/useMessage'

const apiUrl = 'https://api.github.com/repos/MetaCubeX/Clash.Meta/releases/latest'

const loading = ref(true)
const downloadLoading = ref(false)
const getLocalVersionLoading = ref(false)
const getRemoteVersionLoading = ref(false)
const localVersion = ref('')
const remoteVersion = ref('')
const versionDetail = ref('')

const needUpdates = computed(() => localVersion.value !== remoteVersion.value)

const { t } = useI18n()
const { message } = useMessage()

const downloadCore_Meta = async () => {
  if (!needUpdates.value) return
  downloadLoading.value = true
  try {
    const { json } = await HttpGetJSON(apiUrl)
    const { assets, tag_name } = json

    const asset = assets.find((v: any) => v.name === `clash.meta-windows-amd64-${tag_name}.zip`)
    if (!asset) throw 'Asset Not Found'

    const path = KernelWorkDirectory + `/${tag_name}.zip`

    await Download(asset.browser_download_url, path)

    await UnzipZIPFile(path, KernelWorkDirectory)

    message.info('Download Successful')
  } catch (error: any) {
    message.info(error)
  }
  downloadLoading.value = false

  updateLocalVersion_Meta()
}

const getLocalVersion_Meta = async () => {
  getLocalVersionLoading.value = true
  try {
    const res = await Exec(KernelFilePath, '-v')
    versionDetail.value = res.trim()
    return res.trim().match(/v\S+/)?.[0].trim() || ''
  } catch (error) {
    console.log(error)
  } finally {
    getLocalVersionLoading.value = false
  }
  return ''
}

const getRemoteVersion_Meta = async () => {
  getRemoteVersionLoading.value = true
  try {
    const { json } = await HttpGetJSON(apiUrl)
    const { tag_name } = json
    return tag_name as string
  } catch (error) {
    console.log(error)
  } finally {
    getRemoteVersionLoading.value = false
  }
  return ''
}

const updateLocalVersion_Meta = async () => {
  localVersion.value = await getLocalVersion_Meta()
}

const updateRemoteVersion_Meta = async () => {
  remoteVersion.value = await getRemoteVersion_Meta()
}

const initVersion = async () => {
  loading.value = true
  const lv = await getLocalVersion_Meta()
  const rv = await getRemoteVersion_Meta()
  localVersion.value = lv
  remoteVersion.value = rv
  loading.value = false
}

initVersion()
</script>

<template>
  <div class="kernel">
    <div class="item">
      <h3>{{ t('kernel.name') }}</h3>
      <Tag @click="updateLocalVersion_Meta" style="cursor: pointer">
        {{ t('kernel.local') }}
        :
        {{ getLocalVersionLoading || loading ? 'Loading' : localVersion || t('kernel.notFound') }}
      </Tag>
      <Tag @click="updateRemoteVersion_Meta" style="cursor: pointer">
        {{ t('kernel.remote') }}
        :
        {{
          getRemoteVersionLoading || loading
            ? 'Loading'
            : remoteVersion || t('kernel.requestFailed')
        }}
      </Tag>
      <Button
        v-show="remoteVersion && needUpdates"
        @click="downloadCore_Meta"
        :loading="downloadLoading"
        type="primary"
      >
        {{ t('kernel.update') }} : {{ remoteVersion }}
      </Button>
      <div class="detail">
        {{ versionDetail }}
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
</style>
