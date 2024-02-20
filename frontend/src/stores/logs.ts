import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

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

  const regExp = /time="([^"]*)" level=([^ ]*) msg="([^"]*)"/
  const recordKernelLog = (msg: string) => {
    const match = msg.match(regExp)
    if (match) {
      kernelLogs.value.unshift(new Date(match[1]).toLocaleString() + ' ' + match[3])
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
