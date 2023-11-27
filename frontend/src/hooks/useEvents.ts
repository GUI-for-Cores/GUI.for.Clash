import { onMounted, onUnmounted } from 'vue'

import { useLogsStore } from '@/stores/logs'
import { useAppSettingsStore } from '@/stores/appSettings'
import { EventsOff, EventsOn } from '@/utils/bridge'

export const useEvents = () => {
  const logsStore = useLogsStore()
  const appSettings = useAppSettingsStore()

  const registerEvents = () => {
    EventsOn('kernelLog', logsStore.recordKernelLog)
    EventsOn('kernelStatus', (pid) => {
      appSettings.app.kernel.running = !!pid
      appSettings.app.kernel.pid = pid
      logsStore.clearKernelLog()
    })
  }

  const removeEvents = () => {
    EventsOff('kernelLog')
    EventsOff('kernelStatus')
  }

  onMounted(registerEvents)
  onUnmounted(removeEvents)
}
