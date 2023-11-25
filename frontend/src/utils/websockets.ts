type WebSocketsOptions = {
  base?: string
  bearer?: string
  beforeConnect?: () => void
}

export class WebSockets {
  public base: string
  public bearer: string
  public beforeConnect: () => void

  constructor(options: WebSocketsOptions) {
    this.base = options.base || ''
    this.bearer = options.bearer || ''
    this.beforeConnect = options.beforeConnect || (() => 0)
  }

  public connect(urls: { name: string; url: string; cb: (data: any) => void }[]) {
    this.beforeConnect()
    const wsMap: Record<string, WebSocket> = {}
    urls.forEach(({ name, url, cb }) => {
      try {
        const ws = new WebSocket(this.base + url + '?token=' + this.bearer)
        ws.onmessage = (e) => cb(JSON.parse(e.data))
        ws.onerror = () => delete wsMap[name]
        ws.onclose = () => delete wsMap[name]
        wsMap[name] = ws
      } catch (e: any) {
        console.log(e)
      }
    })

    return () => Object.values(wsMap).forEach((ws) => ws.close())
  }
}
