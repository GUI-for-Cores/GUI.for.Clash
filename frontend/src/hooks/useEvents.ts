import { onMounted, onUnmounted } from 'vue'

import { EventsOff, EventsOn } from '@/utils/bridge'
import { useLogsStore, useAppSettingsStore } from '@/stores'

export const useEvents = () => {
  const logsStore = useLogsStore()
  const appSettings = useAppSettingsStore()

  const registerEvents = () => {
    EventsOn('kernelLog', logsStore.recordKernelLog)
    EventsOn('kernelStatus', (pid) => {
      appSettings.app.kernel.running = !!pid
      appSettings.app.kernel.pid = pid
    })
  }

  const removeEvents = () => {
    EventsOff('kernelLog')
    EventsOff('kernelStatus')
  }

  onMounted(registerEvents)
  onUnmounted(removeEvents)
}
