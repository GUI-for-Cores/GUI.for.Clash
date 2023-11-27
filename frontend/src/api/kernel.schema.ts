export type KernelApiConfig = {
  port: number
  'socks-port': number
  'mixed-port': number
  'interface-name': string
  tun: {
    enable: boolean
    stack: string
    'auto-route': boolean
    device: string
  }
  'allow-lan': false
  mode: string
  'log-level': string
  ipv6: false
}

export type Proxy = {
  alive: boolean
  all: string[]
  name: string
  now: string
  type: string
  udp: boolean
  history: {
    delay: number
  }[]
}

export type KernelApiProxies = {
  proxies: Record<string, Proxy>
}

export type KernelApiProviders = {
  providers: Record<
    string,
    {
      name: string
      proxies: Proxy[]
    }
  >
}

export type KernelApiConnections = {
  connections: {
    id: string
    chains: string[]
  }[]
}
