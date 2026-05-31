type IProfileProxyGroup = import('@/enums/kernel').ProxyGroup
type IProfileRulesetBehavior = import('@/enums/kernel').RulesetBehavior
type IProfileRulesetFormat = import('@/enums/kernel').RulesetFormat
type IProfileRuleType = import('@/enums/kernel').RuleType

interface IProfile {
  id: string
  name: string
  generalConfig: {
    mode: string
    ipv6: boolean
    'mixed-port': number
    'allow-lan': boolean
    'log-level': string
    'interface-name': string
  }
  advancedConfig: {
    port: number
    'socks-port': number
    secret: string
    'external-controller': string
    'external-ui': string
    'keep-alive-interval': number
    'find-process-mode': string
    'external-controller-tls': string
    'external-ui-name': string
    'external-ui-url': string
    'unified-delay': boolean
    'tcp-concurrent': boolean
    authentication: string[]
    'skip-auth-prefixes': string[]
    tls: {
      certificate: string
      'private-key': string
    }
    'geodata-mode': boolean
    'geo-auto-update': boolean
    'geo-update-interval': number
    'geodata-loader': string
    'geosite-matcher': string
    'geox-url': {
      geoip: string
      geosite: string
      mmdb: string
      asn: string
    }
    'global-ua': string
    profile: {
      'store-selected'?: boolean
      'store-fake-ip'?: boolean
    }
    'lan-allowed-ips': string[]
    'lan-disallowed-ips': string[]
  }
  tunConfig: {
    enable: boolean
    stack: string
    'auto-route': boolean
    'route-address': string[]
    'route-exclude-address': string[]
    'auto-detect-interface': boolean
    'dns-hijack': string[]
    device: string
    mtu: number
    'strict-route': boolean
    'endpoint-independent-nat': boolean
  }
  dnsConfig: {
    enable: boolean
    listen: string
    'use-hosts': boolean
    'use-system-hosts': boolean
    ipv6: boolean
    'default-nameserver': string[]
    nameserver: string[]
    'enhanced-mode': string
    'fake-ip-range': string
    'fake-ip-range6': string
    'fake-ip-filter-mode': string
    'fake-ip-filter': string[]
    'prefer-h3': boolean
    fallback: string[]
    'proxy-server-nameserver': string[]
    'direct-nameserver': string[]
    'nameserver-policy': Record<string, any>
    'fallback-filter': {
      geoip: boolean
      'geoip-code': string
      geosite: string[]
      ipcidr: string[]
      domain: string[]
    }
    hosts: Record<string, string>
  }
  proxyGroupsConfig: {
    id: string
    name: string
    type: IProfileProxyGroup
    proxies: {
      id: string
      type: string
      name: string
    }[]
    url: string
    interval: number
    strategy: string
    use: string[]
    tolerance: number
    lazy: boolean
    'disable-udp': boolean
    filter: string
    'exclude-filter': string
    hidden: boolean
    icon: string
  }[]
  rulesConfig: {
    id: string
    enable: boolean
    type: IProfileRuleType
    payload: string
    proxy: string
    'no-resolve': boolean
    'ruleset-type': 'file' | 'http' | 'inline'
    'ruleset-name': string
    'ruleset-behavior': IProfileRulesetBehavior
    'ruleset-format': IProfileRulesetFormat
    'ruleset-proxy': string
    'ruleset-interval': number
  }[]
  sniffer: {
    enable: boolean
    'force-dns-mapping': boolean
    'parse-pure-ip': boolean
    'override-destination': boolean
    'force-domain': string[]
    'skip-domain': string[]
    'skip-src-address': string[]
    'skip-dst-address': string[]
    sniff: {
      HTTP: {
        enable: boolean
        ports: string[]
      }
      TLS: {
        enable: boolean
        ports: string[]
      }
      QUIC: {
        enable: boolean
        ports: string[]
      }
    }
  }
  mixinConfig: {
    priority: 'mixin' | 'gui'
    format: 'json' | 'yaml'
    config: string
  }
  scriptConfig: {
    code: string
  }
}
