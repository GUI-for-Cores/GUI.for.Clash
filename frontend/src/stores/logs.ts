import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { formatDate } from '@/utils'
import { useMessage } from '@/hooks'

const MAX_LINES = 9000

type TaskLogType = {
  name: string
  startTime: number
  endTime: number
  result: string[]
}

export const useLogsStore = defineStore('logs', () => {
  const kernelLogs = ref<string[]>([])
  const scheduledtasksLogs = ref<TaskLogType[]>([])
  const { message } = useMessage()

  const regExp = /time="([^"]*)" level=([^ ]*) msg="([^"]*)"/
  const recordKernelLog = (msg: string) => {
    const match = msg.match(regExp)
    if (
      (msg.includes('level=error') || msg.includes('Parse config error')) &&
      /**
       * Remove it if the kernel has already fixed this bug
       */
      !msg.includes('PrepareUIPath error')
    ) {
      message.error(msg)
    }
    if (match) {
      kernelLogs.value.unshift(formatDate(match[1], 'YYYY-MM-DD HH:mm:ss') + ' ' + match[3])
    } else {
      kernelLogs.value.unshift(msg)
    }
    if (kernelLogs.value.length > MAX_LINES) {
      kernelLogs.value.pop()
    }
  }

  const recordScheduledTasksLog = (log: TaskLogType) => scheduledtasksLogs.value.unshift(log)

  const isTasksLogEmpty = computed(() => scheduledtasksLogs.value.length === 0)

  const isEmpty = computed(() => kernelLogs.value.length === 0)

  const clearKernelLog = () => kernelLogs.value.splice(0)

  return {
    recordKernelLog,
    clearKernelLog,
    kernelLogs,
    isEmpty,
    scheduledtasksLogs,
    isTasksLogEmpty,
    recordScheduledTasksLog
  }
})
