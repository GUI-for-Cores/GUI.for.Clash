<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { parse } from 'yaml'

import type { Subscription } from '@/types/app'

import { Readfile, Writefile } from '@/bridge'
import { deepClone, ignoredError, message, omitArray, sampleID, stringifyNoFolding } from '@/utils'
import { useSubscribesStore } from '@/stores'

interface Props {
  sub: Subscription
}

const props = defineProps<Props>()

const loading = ref(false)
const proxiesText = ref('')
const sub = ref(deepClone(props.sub))

const { t } = useI18n()
const subscribeStore = useSubscribesStore()

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any

const handleSave = async () => {
  loading.value = true
  try {
    const { path, proxies, id } = sub.value
    const proxiesWithId: Record<string, any>[] = parse(proxiesText.value)
    sub.value.proxies = proxiesWithId.map((v) => ({
      id: proxies.find((proxy) => proxy.id === v.__id_in_gui)?.id || sampleID(),
      name: v.name,
      type: v.type,
    }))
    await Writefile(
      path,
      stringifyNoFolding({ proxies: omitArray(proxiesWithId, ['__id_in_gui']) }),
    )
    await subscribeStore.editSubscribe(id, sub.value)
    handleSubmit()
  } catch (error: any) {
    console.log(error)

    message.error(error.message || error)
  }
  loading.value = false
}

const initProxiesText = async () => {
  const content = (await ignoredError(Readfile, sub.value.path)) || 'proxies: []'
  const proxies: Subscription['proxies'] = parse(content).proxies
  const proxiesWithId = proxies.map((proxy) => {
    return {
      __id_in_gui: sub.value.proxies.find((v) => v.name === proxy.name)?.id || sampleID(),
      ...proxy,
    }
  })
  proxiesText.value = stringifyNoFolding(proxiesWithId)
}

initProxiesText()
</script>

<template>
  <div class="proxies-view">
    <CodeViewer v-model="proxiesText" lang="yaml" editable class="code" />
    <div class="form-action">
      <Button @click="handleCancel" :disabled="loading">
        {{ t('common.cancel') }}
      </Button>
      <Button @click="handleSave" :loading="loading" type="primary">
        {{ t('common.save') }}
      </Button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.proxies-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.code {
  flex: 1;
  overflow-y: auto;
}
</style>
