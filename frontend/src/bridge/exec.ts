import { sampleID } from '@/utils'
import * as App from '@wails/go/bridge/App'
import { EventsOn, EventsOff } from '@wails/runtime/runtime'

export const Exec = async (path: string, args: string[], convert = false) => {
  const { flag, data } = await App.Exec(path, args, convert)
  if (!flag) {
    throw data
  }
  return data
}

export const ExecBackground = async (
  path: string,
  args: string[],
  onOut: (out: string) => void,
  onEnd: () => void
) => {
  const outEvent = sampleID()
  const endEvent = sampleID()
  const { flag, data } = await App.ExecBackground(path, args, outEvent, endEvent)
  if (!flag) {
    throw data
  }

  EventsOn(outEvent, (out: string) => {
    onOut && onOut(out)
  })

  EventsOn(endEvent, () => {
    onEnd && onEnd()
    EventsOff(outEvent)
    EventsOff(endEvent)
  })

  return Number(data)
}

export const ProcessInfo = async (pid: number) => {
  const { flag, data } = await App.ProcessInfo(pid)
  if (!flag) {
    throw data
  }
  return data
}

export const KillProcess = async (pid: number) => {
  const { flag, data } = await App.KillProcess(pid)
  if (!flag) {
    throw data
  }
  return data
}
