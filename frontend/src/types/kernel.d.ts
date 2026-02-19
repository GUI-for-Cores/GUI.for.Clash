export interface CoreApiConfig {
  port: number
  'socks-port': number
  'mixed-port': number
  'interface-name': string
  'allow-lan': false
  mode: string
  tun: {
    enable: boolean
    stack: string
    device: string
  }
}

export interface CoreApiProxy {
  alive: boolean
  all: string[]
  hidden: boolean
  icon: string
  name: string
  now: string
  type: string
  udp: boolean
  fixed: string
  history: {
    delay: number
  }[]
}

export interface CoreApiProxies {
  proxies: Record<string, Proxy>
}

export interface CoreApiConnections {
  connections: {
    id: string
    chains: string[]
  }[]
}

export interface CoreApiTrafficData {
  down: number
  up: number
}

export interface CoreApiMemoryData {
  inuse: number
  oslimit: number
}

export interface CoreApiLogsData {
  type: string
  payload: string
}

export interface CoreApiConnectionsData {
  memory: number
  uploadTotal: number
  downloadTotal: number
  connections: {
    id: string
    metadata: {
      network: string
      type: string
      sourceIP: string
      destinationIP: string
      sourceGeoIP: string
      destinationGeoIP: string
      sourceIPASN: string
      destinationIPASN: string
      sourcePort: string
      destinationPort: string
      inboundIP: string
      inboundPort: string
      inboundName: string
      inboundUser: string
      host: string
      dnsMode: string
      uid: number
      process: string
      processPath: string
      specialProxy: string
      specialRules: string
      remoteDestination: string
      dscp: number
      sniffHost: string
    }
    upload: number
    download: number
    start: string
    chains: string[]
    rule: string
    rulePayload: string
  }[]
}

export type CoreApiWsDataMap = {
  logs: CoreApiLogsData
  memory: CoreApiMemoryData
  traffic: CoreApiTrafficData
  connections: CoreApiConnectionsData
}
