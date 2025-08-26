<script setup lang="ts">
import { ref, inject, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { parse } from 'yaml'

import { ReadFile, WriteFile } from '@/bridge'
import { useSubscribesStore } from '@/stores'
import { deepClone, ignoredError, message, omitArray, sampleID, stringifyNoFolding } from '@/utils'

import Button from '@/components/Button/index.vue'

import type { Subscription } from '@/types/app'

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
    await WriteFile(
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
  const content = (await ignoredError(ReadFile, sub.value.path)) || 'proxies: []'
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

const modalSlots = {
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
        onClick: handleSave,
      },
      () => t('common.save'),
    ),
}

defineExpose({ modalSlots })
</script>

<template>
  <CodeViewer v-model="proxiesText" lang="yaml" editable class="code" />
</template>
