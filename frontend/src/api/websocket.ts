type WebSocketsOptions = {
  base?: string
  bearer?: string
  beforeConnect?: () => void
}

type Options = { url: string; cb: (data: any) => void; params?: Record<string, any> }

export class WebSockets {
  public base: string
  public bearer: string
  public beforeConnect: () => void

  constructor(options: WebSocketsOptions) {
    this.base = options.base || ''
    this.bearer = options.bearer || ''
    this.beforeConnect = options.beforeConnect || (() => 0)
  }

  public createWS(options: Options) {
    this.beforeConnect()

    const params = { ...options.params, token: this.bearer }
    const query = new URLSearchParams(params).toString()
    const url = query ? `${options.url}?${query}` : options.url

    let isManualClose = false
    let ws: WebSocket | null = null

    const connect = () => {
      ws = new WebSocket(this.base + url)
      ws.onmessage = (e) => options.cb(JSON.parse(e.data))
      ws.onclose = () => {
        setTimeout(() => {
          if (!isManualClose) {
            setTimeout(connect, 3000)
          }
        }, 1000)
      }
    }

    const disconnect = () => {
      isManualClose = true
      if (ws) {
        ws.onmessage = null
        ws.onclose = null
        ws.close()
        ws = null
      }
    }

    return { connect, disconnect }
  }
}
