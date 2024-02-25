<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBool, useMessage } from '@/hooks'
import { deepClone } from '@/utils'
import {
  usePluginsStore,
  useAppSettingsStore,
  type PluginType,
  type PluginConfiguration
} from '@/stores'

interface Props {
  id: string
}

const props = defineProps<Props>()

const settings = ref<Record<string, any>>({})
const plugin = ref<PluginType>()

const { t } = useI18n()
const { message } = useMessage()
const pluginsStore = usePluginsStore()
const appSettingsStore = useAppSettingsStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {}

const p = pluginsStore.getPluginById(props.id)
if (p) {
  plugin.value = p
  settings.value = appSettingsStore.app.pluginSettings[p.id]
}
</script>

<template>
  {{ settings }}
  <div class="form">
    <div v-for="key in Object.keys(settings)" :key="key" class="form-item">
      <!-- <div class="name">{{ getLabel(key) }}</div> -->
    </div>
  </div>
  <div class="form-action">
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button @click="handleSubmit" type="primary">
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.form {
  padding: 0 8px;
  overflow-y: auto;
  max-height: 58vh;
  .name {
    font-size: 14px;
    padding: 8px 0;
    white-space: nowrap;
  }
}
</style>
