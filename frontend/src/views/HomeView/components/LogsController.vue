<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { ref, computed, onUnmounted } from 'vue'

import type { Menu } from '@/stores'
import { LogLevelOptions } from '@/constant'
import { useBool, useMessage, usePicker, type PickerItem } from '@/hooks'
import { getKernelLogsWS, updateProvidersRules } from '@/api/kernel'
import {
  isValidIPv4,
  isValidIPv6,
  addToRuleSet,
  ignoredError,
  setIntervalImmediately
} from '@/utils'

const logType = ref('info')
const keywords = ref('')
const logs = ref<{ type: string; payload: string }[]>([])
const keywordsRegexp = computed(() => new RegExp(keywords.value))

const LogLevelMap: Record<string, string[]> = {
  silent: ['silent'],
  error: ['error'],
  warning: ['error', 'warning'],
  info: ['error', 'warning', 'info'],
  debug: ['error', 'warning', 'info', 'debug']
}

const filteredLogs = computed(() => {
  return logs.value.filter((v) => {
    const hitType = LogLevelMap[logType.value].includes(v.type)
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
      if (type !== 'info') {
        message.error('Not Support')
        return
      }
      const regex = /([a-zA-Z0-9.-]+(?=:))/g
      const matches = payload.match(regex)
      if (!matches || matches.length < 2) {
        message.error('Not Matched')
        return
      }

      const options: PickerItem[] = []

      if (isValidIPv4(matches[1])) {
        options.push({
          label: t('kernel.rules.type.IP-CIDR'),
          value: 'IP-CIDR,' + matches[1] + '/32,no-resolve',
          description: matches[1]
        })
      } else if (isValidIPv6(matches[1])) {
        options.push({
          label: t('kernel.rules.type.IP-CIDR6'),
          value: 'IP-CIDR6,' + matches[1] + '/32,no-resolve',
          description: matches[1]
        })
      } else {
        options.push({
          label: t('kernel.rules.type.DOMAIN'),
          value: 'DOMAIN,' + matches[1],
          description: matches[1]
        })
      }

      const payloads = await picker.multi<string[]>('rulesets.selectRuleType', options, [
        options?.[0].value
      ])

      try {
        await addToRuleSet(ruleset as any, payloads)
        await ignoredError(updateProvidersRules, ruleset)
        message.success('common.success')
      } catch (error: any) {
        message.error(error)
        console.log(error)
      }
    }
  }
})

const { t } = useI18n()
const { message } = useMessage()
const { picker } = usePicker()
const [pause, togglePause] = useBool(false)

const handleClear = () => logs.value.splice(0)

const onLogs = (data: any) => {
  pause.value || logs.value.unshift(data)
}

const { connect, disconnect } = getKernelLogsWS(onLogs)
const timer = setIntervalImmediately(connect, 1000)

onUnmounted(() => {
  clearInterval(timer)
  disconnect()
})
</script>

<template>
  <div class="logs-view">
    <div class="form">
      <span class="label">
        {{ t('kernel.log-level') }}
        :
      </span>
      <Select v-model="logType" :options="LogLevelOptions" size="small" />
      <Input
        v-model="keywords"
        clearable
        auto-size
        size="small"
        :placeholder="t('common.keywords')"
        class="ml-8 flex-1"
      />
      <Button @click="togglePause" type="text" size="small" class="ml-8">
        <Icon :icon="pause ? 'play' : 'pause'" fill="var(--color)" />
      </Button>
      <Button @click="handleClear" v-tips="'common.clear'" size="small" type="text">
        <Icon icon="clear" fill="var(--color)" />
      </Button>
    </div>

    <Empty v-if="filteredLogs.length === 0" class="flex-1" />

    <div v-else class="logs">
      <div
        v-for="log in filteredLogs"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(log) }))"
        :key="log.payload"
        class="log select-text"
      >
        <span class="type">{{ log.type }}</span> {{ log.payload }}
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.logs-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logs {
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;

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
}

.form {
  display: flex;
  align-items: center;
  .label {
    padding-right: 8px;
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
