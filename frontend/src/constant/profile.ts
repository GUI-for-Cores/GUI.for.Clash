import type { ProfileType } from '@/stores/profiles'
import { sampleID } from '@/utils'

export const GeneralConfigDefaults: ProfileType['generalConfig'] = {
  mode: 'rule',
  ipv6: false,
  'mixed-port': 0,
  'allow-lan': false,
  'log-level': 'info',
  'interface-name': 'WLAN'
}

export const AdvancedConfigDefaults: ProfileType['advancedConfig'] = {
  port: 0,
  'socks-port': 0,
  secret: '',
  'external-controller': '127.0.0.1:9090',
  'external-ui': '',
  'keep-alive-interval': 30,
  'find-process-mode': 'strict',
  'external-controller-tls': '',
  'external-ui-name': '',
  'external-ui-url': '',
  'unified-delay': true,
  'tcp-concurrent': true,
  tls: {
    certificate: '',
    'private-key': ''
  },
  'global-client-fingerprint': 'chrome',
  'geodata-mode': true,
  'geodata-loader': 'standard',
  'geox-url': {
    geoip: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat',
    geosite: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat',
    mmdb: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb'
  },
  'global-ua': 'clash.meta',
  profile: {
    'store-selected': true,
    'store-fake-ip': true
  }
}

export const TunConfigDefaults: ProfileType['tunConfig'] = {
  enable: true,
  stack: 'System',
  'auto-route': true,
  'auto-detect-interface': false,
  'dns-hijack': ['any:53' /* '198.18.0.2:53' */],
  device: 'ClashTun',
  mtu: 9000,
  'strict-route': true,
  'endpoint-independent-nat': false
}

export const DnsConfigDefaults: ProfileType['dnsConfig'] = {
  enable: true,
  ipv6: false,
  'default-nameserver': [],
  nameserver: ['https://223.5.5.5/dns-query'],
  'enhanced-mode': 'fake-ip',
  'fake-ip-range': '198.18.0.1/16',
  'fake-ip-filter': [
    '*.lan',
    '*.localdomain',
    '*.example',
    '*.invalid',
    '*.localhost',
    '*.test',
    '*.local',
    '*.home.arpa',
    '*.msftconnecttest.com',
    '*.msftncsi.com'
  ],
  'prefer-h3': true
}

export const ProxyGroupsConfigDefaults: ProfileType['proxyGroupsConfig'] = [
  {
    id: sampleID(),
    name: '🚀 节点选择',
    type: 'select',
    proxies: [{ type: 'Built-In', name: '🎈 自动选择' }],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: ''
  },
  {
    id: sampleID(),
    name: '🎈 自动选择',
    type: 'url-test',
    proxies: [],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: ''
  },
  {
    id: sampleID(),
    name: '🎯 全球直连',
    type: 'select',
    proxies: [
      { type: 'Built-In', name: 'DIRECT' },
      { type: 'Built-In', name: 'REJECT' }
    ],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: ''
  },
  {
    id: sampleID(),
    name: '🛑 全球拦截',
    type: 'select',
    proxies: [
      { type: 'Built-In', name: 'REJECT' },
      { type: 'Built-In', name: 'DIRECT' }
    ],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: ''
  },
  {
    id: sampleID(),
    name: '🐟 漏网之鱼',
    type: 'select',
    proxies: [
      { type: 'Built-In', name: '🚀 节点选择' },
      { type: 'Built-In', name: '🎯 全球直连' }
    ],
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    strategy: 'consistent-hashing',
    use: [],
    tolerance: 150,
    lazy: true,
    'disable-udp': false,
    filter: ''
  }
]

export const RulesConfigDefaults: ProfileType['rulesConfig'] = [
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'category-ads-all',
    proxy: '🛑 全球拦截',
    'no-resolve': false,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'GEOIP',
    payload: 'private',
    proxy: '🎯 全球直连',
    'no-resolve': true,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'GEOIP',
    payload: 'CN',
    proxy: '🎯 全球直连',
    'no-resolve': true,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'private',
    proxy: '🎯 全球直连',
    'no-resolve': false,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'CN',
    proxy: '🎯 全球直连',
    'no-resolve': false,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'geolocation-!cn',
    proxy: '🚀 节点选择',
    'no-resolve': false,
    filter: ''
  },
  {
    id: sampleID(),
    type: 'MATCH',
    payload: '',
    proxy: '🐟 漏网之鱼',
    'no-resolve': false,
    filter: ''
  }
]
