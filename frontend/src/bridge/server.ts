import { sampleID } from '@/utils'
import * as App from '@wails/go/bridge/App'
import { EventsOn, EventsOff, EventsEmit } from '@wails/runtime/runtime'

type RequestType = { url: string; method: string; headers: Record<string, string> }
type ResponseType = { end: (status: number, body: string) => void }
type HttpServerHandler = (req: RequestType, res: ResponseType) => void

export const StartServer = async (address: string, handler: HttpServerHandler) => {
  const { flag, data } = await App.StartServer(address)
  if (!flag) {
    throw data
  }

  EventsOn(data, (...args) => {
    const [id, method, url, headers] = args
    handler(
      {
        method,
        url,
        headers
      },
      {
        end: (status, body) => {
          EventsEmit(id, status, body)
        }
      }
    )
  })
  return { serverID: data, close: () => App.StopServer(data) }
}

export const StopServer = async (serverID: string) => {
  const { flag, data } = await App.StopServer(serverID)
  if (!flag) {
    throw data
  }
  return data
}

export const ListServer = App.ListServer
