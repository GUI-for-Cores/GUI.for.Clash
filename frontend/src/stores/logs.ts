import { ref } from 'vue'
import { defineStore } from 'pinia'

const MAX_LINES = 9000

export const useLogsStore = defineStore('logs', () => {
  const kernelLogs = ref<string[]>([])

  const recordKernelLog = (msg: string) => {
    kernelLogs.value.push(msg)
    if (kernelLogs.value.length > MAX_LINES) {
      kernelLogs.value.shift()
    }
  }

  const clearKernelLog = () => kernelLogs.value.splice(0)

  return { recordKernelLog, clearKernelLog, kernelLogs }
})
