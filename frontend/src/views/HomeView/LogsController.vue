<script lang="ts" setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getKernelLogsWS } from '@/api/kernel'
import { LogLevelOptions } from '@/constant/kernel'
import { useBool } from '@/hooks'

const logType = ref('')
const keywords = ref('')
const logs = ref<{ type: string; payload: string }[]>([])
const keywordsRegexp = computed(() => new RegExp(keywords.value))

const filteredLogs = computed(() => {
  return logs.value.filter((v) => {
    const hitType = logType.value ? logType.value === v.type : true
    const hitName = keywordsRegexp.value.test(v.payload)
    return hitName && hitType
  })
})

const { t } = useI18n()
const [pause, togglePause] = useBool(false)

const handleReset = () => {
  logType.value = ''
  keywords.value = ''
}

const handleClear = () => logs.value.splice(0)

const onLogs = (data: any) => {
  pause.value || logs.value.unshift(data)
}

const disconnect = getKernelLogsWS(onLogs)

onUnmounted(disconnect)
</script>

<template>
  <div class="form">
    <span class="label"> {{ t('kernel.log-level') }}: </span>
    <Select v-model="logType" :options="LogLevelOptions" :border="false" />
    <span class="label"> {{ t('home.overview.keywords') }}: </span>
    <Input v-model="keywords" :border="false" style="margin-right: 8px" />
    <Button @click="handleReset" type="primary">
      {{ t('common.reset') }}
    </Button>
    <Button @click="togglePause" type="normal" style="margin-left: auto">
      {{ pause ? t('common.resume') : t('common.pause') }}
    </Button>
    <Button @click="handleClear" type="normal">
      {{ t('common.clear') }}
    </Button>
  </div>
  <div class="logs">
    <div v-for="(log, i) in filteredLogs" :key="i" class="log">
      <span class="type">{{ log.type }}</span> {{ log.payload }}
    </div>
  </div>
</template>

<style lang="less" scoped>
.log {
  font-size: 12px;
  padding: 2px 4px;
  margin: 4px 0;
  background: var(--card-bg);
}

.form {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  background-color: var(--modal-bg);
  backdrop-filter: blur(2px);
  .label {
    padding: 0 8px;
    font-size: 12px;
  }
}

.type {
  display: inline-block;
  width: 50px;
  text-align: center;
  color: var(--primary-color);
}
</style>
