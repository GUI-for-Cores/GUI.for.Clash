export enum ProxyGroup {
  Select = 'select',
  UrlTest = 'url-test',
  Fallback = 'fallback',
  Relay = 'relay',
  LoadBalance = 'load-balance'
}

// Why not unify the design with the above?
export enum ProxyGroupType {
  Selector = 'Selector',
  UrlTest = 'URLTest',
  Fallback = 'Fallback',
  Relay = 'Relay',
  LoadBalance = 'LoadBalance'
}

export const KernelWorkDirectory = 'data/mihomo'

export const KernelFilePath = KernelWorkDirectory + '/mihomo-windows-amd64.exe'

export const KernelConfigFilePath = KernelWorkDirectory + '/config.yaml'

export const ModeOptions = [
  {
    label: 'kernel.global',
    value: 'global',
    desp: 'kernel.globalDesp'
  },
  {
    label: 'kernel.rule',
    value: 'rule',
    desp: 'kernel.ruleDesp'
  },
  {
    label: 'kernel.direct',
    value: 'direct',
    desp: 'kernel.directDesp'
  }
]

export const LogLevelOptions = [
  {
    label: 'kernel.info',
    value: 'info'
  },
  {
    label: 'kernel.warning',
    value: 'warning'
  },
  {
    label: 'kernel.error',
    value: 'error'
  },
  {
    label: 'kernel.debug',
    value: 'debug'
  },
  {
    label: 'kernel.silent',
    value: 'silent'
  }
]

export const FindProcessModeOptions = [
  {
    label: 'kernel.always',
    value: 'always'
  },
  {
    label: 'kernel.strict',
    value: 'strict'
  },
  {
    label: 'kernel.off',
    value: 'off'
  }
]

export const GlobalClientFingerprintOptions = [
  { label: 'kernel.chrome', value: 'chrome' },
  { label: 'kernel.firefox', value: 'firefox' },
  { label: 'kernel.safari', value: 'safari' },
  { label: 'kernel.iOS', value: 'iOS' },
  { label: 'kernel.android', value: 'android' },
  { label: 'kernel.edge', value: 'edge' },
  { label: 'kernel.360', value: '360' },
  { label: 'kernel.qq', value: 'qq' },
  { label: 'kernel.random', value: 'random' }
]

export const GeodataLoaderOptions = [
  { label: 'kernel.standard', value: 'standard' },
  { label: 'kernel.memconservative', value: 'memconservative' }
]

export const GroupsTypeOptions = [
  {
    label: 'kernel.proxyGroups.type.select',
    value: ProxyGroup.Select
  },
  {
    label: 'kernel.proxyGroups.type.url-test',
    value: ProxyGroup.UrlTest
  },
  {
    label: 'kernel.proxyGroups.type.fallback',
    value: ProxyGroup.Fallback
  },
  {
    label: 'kernel.proxyGroups.type.relay',
    value: ProxyGroup.Relay
  },
  {
    label: 'kernel.proxyGroups.type.load-balance',
    value: ProxyGroup.LoadBalance
  }
]

export const StrategyOptions = [
  {
    label: 'kernel.proxyGroups.strategy.consistent-hashing',
    value: 'consistent-hashing'
  },
  {
    label: 'kernel.proxyGroups.strategy.round-robin',
    value: 'round-robin'
  }
]

export const RulesTypeOptions = [
  {
    label: 'kernel.rules.type.DOMAIN',
    value: 'DOMAIN'
  },
  {
    label: 'kernel.rules.type.DOMAIN-SUFFIX',
    value: 'DOMAIN-SUFFIX'
  },
  {
    label: 'kernel.rules.type.DOMAIN-KEYWORD',
    value: 'DOMAIN-KEYWORD'
  },
  {
    label: 'kernel.rules.type.GEOIP',
    value: 'GEOIP'
  },
  {
    label: 'kernel.rules.type.IP-CIDR',
    value: 'IP-CIDR'
  },
  {
    label: 'kernel.rules.type.IP-CIDR6',
    value: 'IP-CIDR6'
  },
  {
    label: 'kernel.rules.type.SRC-IP-CIDR',
    value: 'SRC-IP-CIDR'
  },
  {
    label: 'kernel.rules.type.SRC-PORT',
    value: 'SRC-PORT'
  },
  {
    label: 'kernel.rules.type.DST-PORT',
    value: 'DST-PORT'
  },
  {
    label: 'kernel.rules.type.PROCESS-NAME',
    value: 'PROCESS-NAME'
  },
  {
    label: 'kernel.rules.type.PROCESS-PATH',
    value: 'PROCESS-PATH'
  },
  // To be realized
  // {
  //   label: 'kernel.rules.type.RULE-SET',
  //   value: 'RULE-SET'
  // },
  // {
  //   label: 'kernel.rules.type.SCRIPT',
  //   value: 'SCRIPT'
  // },
  {
    label: 'kernel.rules.type.GEOIP',
    value: 'GEOIP'
  },
  {
    label: 'kernel.rules.type.GEOSITE',
    value: 'GEOSITE'
  },
  {
    label: 'kernel.rules.type.MATCH',
    value: 'MATCH'
  }
]

export const StackOptions = [
  { label: 'kernel.tun.system', value: 'System' },
  { label: 'kernel.tun.gvisor', value: 'gVisor' },
  { label: 'kernel.tun.mixed', value: 'Mixed' }
  // { label: 'kernel.tun.lwip', value: 'LWIP' }
]

export const EnhancedModeOptions = [
  {
    label: 'kernel.dns.fake-ip',
    value: 'fake-ip'
  },
  {
    label: 'kernel.dns.redir-host',
    value: 'redir-host'
  }
]

export const ProxyTypeOptions = [
  {
    label: 'direct',
    value: 'direct'
  },
  {
    label: 'http',
    value: 'http'
  },
  {
    label: 'socks5',
    value: 'socks5'
  },
  {
    label: 'ss',
    value: 'ss'
  },
  {
    label: 'ssr',
    value: 'ssr'
  },
  {
    label: 'vmess',
    value: 'vmess'
  },
  {
    label: 'vless',
    value: 'vless'
  },
  {
    label: 'trojan',
    value: 'trojan'
  },
  {
    label: 'hysteria',
    value: 'hysteria'
  },
  {
    label: 'hysteria2',
    value: 'hysteria2'
  },
  {
    label: 'tuic',
    value: 'tuic'
  },
  {
    label: 'wireguard',
    value: 'wireguard'
  }
]
