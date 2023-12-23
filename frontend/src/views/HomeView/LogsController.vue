<script lang="ts" setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getKernelLogsWS, updateProvidersRules } from '@/api/kernel'
import { LogLevelOptions } from '@/constant/kernel'
import { useBool, useMessage } from '@/hooks'
import type { Menu } from '@/stores'
import { isValidIPV4 } from '@/utils/is'
import { addToRuleSet } from '@/utils/generator'

const logType = ref('info')
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

const menus: Menu[] = [
  ['home.connections.addToDirect', 'direct'],
  ['home.connections.addToProxy', 'proxy'],
  ['home.connections.addToReject', 'reject']
].map(([label, ruleset]) => {
  return {
    label,
    handler: async ({ type, payload }: any) => {
      try {
        if (type !== 'info') throw 'Not Support'
        await addToRuleSet(ruleset as any, getPayload(payload))
        await updateProvidersRules(ruleset)
        message.info('success')
      } catch (error: any) {
        message.info(error)
        console.log(error)
      }
    }
  }
})

const { t } = useI18n()
const { message } = useMessage()
const [pause, togglePause] = useBool(false)

const handleReset = () => {
  logType.value = ''
  keywords.value = ''
}

const handleClear = () => logs.value.splice(0)

const getPayload = (str = '') => {
  const regex = /([a-zA-Z0-9.-]+(?=:))/g
  const matches = str.match(regex)
  if (matches && matches.length >= 2) {
    if (isValidIPV4(matches[1])) {
      return 'IP-CIDR,' + matches[1] + '/32,no-resolve'
    }

    return 'DOMAIN,' + matches[1]
  }

  throw 'GetPayload Error'
}

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
    <span class="label"> {{ t('common.keywords') }}: </span>
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
    <div
      v-for="log in filteredLogs"
      v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(log) }))"
      :key="log.payload"
      class="log user-select"
    >
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
  &:hover {
    color: #fff;
    background: var(--primary-color);
    .type {
      color: #fff;
    }
  }
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
