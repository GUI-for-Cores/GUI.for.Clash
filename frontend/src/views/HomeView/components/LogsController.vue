<script lang="ts" setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { updateProvidersRules } from '@/api/kernel'
import { LogLevelOptions } from '@/constant'
import { useBool } from '@/hooks'
import { useKernelApiStore } from '@/stores'
import { isValidIPv4, isValidIPv6, addToRuleSet, ignoredError, message, picker } from '@/utils'

import { type PickerItem } from '@/components/Picker/index.vue'

import type { Menu } from '@/types/app'

const logType = ref('info')
const keywords = ref('')
const logs = ref<{ type: string; payload: string }[]>([])
const keywordsRegexp = computed(() => new RegExp(keywords.value))

const LogLevelMap: Record<string, string[]> = {
  silent: ['silent'],
  error: ['error'],
  warning: ['error', 'warning'],
  info: ['error', 'warning', 'info'],
  debug: ['error', 'warning', 'info', 'debug'],
}

const filteredLogs = computed(() => {
  return logs.value.filter((v) => {
    const hitType = LogLevelMap[logType.value].includes(v.type)
    const hitName = keywordsRegexp.value.test(v.payload)
    return hitName && hitType
  })
})

const menus: Menu[] = (
  [
    ['home.connections.addToDirect', 'direct'],
    ['home.connections.addToProxy', 'proxy'],
    ['home.connections.addToReject', 'reject'],
  ] as const
).map(([label, ruleset]) => {
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

      const options: PickerItem<string>[] = []

      if (isValidIPv4(matches[1])) {
        options.push({
          label: t('kernel.rules.type.IP-CIDR'),
          value: 'IP-CIDR,' + matches[1] + '/32,no-resolve',
          description: matches[1],
        })
      } else if (isValidIPv6(matches[1])) {
        options.push({
          label: t('kernel.rules.type.IP-CIDR6'),
          value: 'IP-CIDR6,' + matches[1] + '/32,no-resolve',
          description: matches[1],
        })
      } else {
        options.push({
          label: t('kernel.rules.type.DOMAIN'),
          value: 'DOMAIN,' + matches[1],
          description: matches[1],
        })
      }

      const payloads = await picker.multi('rulesets.selectRuleType', options, [options?.[0].value])

      try {
        await addToRuleSet(ruleset, payloads)
        await ignoredError(updateProvidersRules, ruleset)
        message.success('common.success')
      } catch (error: any) {
        message.error(error)
        console.log(error)
      }
    },
  }
})

const { t } = useI18n()
const [pause, togglePause] = useBool(false)
const kernelApiStore = useKernelApiStore()

const handleClear = () => logs.value.splice(0)

const unregisterLogsHandler = kernelApiStore.onLogs((data) => {
  pause.value || logs.value.unshift(data)
})

onUnmounted(() => {
  unregisterLogsHandler()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center">
      <span class="text-12 pr-8">
        {{ t('kernel.log-level') }}
        :
      </span>
      <Select v-model="logType" :options="LogLevelOptions" size="small" />
      <Input
        v-model="keywords"
        clearable
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

    <Empty v-if="filteredLogs.length === 0" />

    <div v-else class="mt-8 overflow-y-auto">
      <div
        v-for="log in filteredLogs"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(log) }))"
        :key="log.payload"
        class="log select-text text-12 py-2 px-4 my-4"
      >
        <span class="type inline-block text-center">{{ log.type }}</span> {{ log.payload }}
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.log {
  background: var(--card-bg);
  &:hover {
    color: #fff;
    background: var(--primary-color);
    .type {
      color: #fff;
    }
  }
}

.type {
  width: 50px;
  color: var(--primary-color);
}
</style>
