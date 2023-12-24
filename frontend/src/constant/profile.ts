import { sampleID } from '@/utils'
import type { ProfileType } from '@/stores'
import { ProxyGroup } from '@/constant'

export const GeneralConfigDefaults: ProfileType['generalConfig'] = {
  mode: 'rule',
  ipv6: false,
  // a meaningful port
  'mixed-port': 20112,
  'allow-lan': false,
  'log-level': 'silent',
  'interface-name': 'WLAN'
}

export const AdvancedConfigDefaults = (): ProfileType['advancedConfig'] => ({
  port: 0,
  'socks-port': 0,
  secret: sampleID(),
  'external-controller': '127.0.0.1:20113',
  'external-ui': '',
  'keep-alive-interval': 30,
  'find-process-mode': 'strict',
  'external-controller-tls': '',
  'external-ui-name': '',
  'external-ui-url': '',
  'unified-delay': true,
  'tcp-concurrent': true,
  authentication: [],
  'skip-auth-prefixes': ['127.0.0.1/8', '::1/128'],
  tls: {
    certificate: '',
    'private-key': ''
  },
  'global-client-fingerprint': 'chrome',
  'geodata-mode': true,
  'geo-auto-update': false,
  'geo-update-interval': 24,
  'geodata-loader': 'standard',
  'geox-url': {
    geoip: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat',
    geosite: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat',
    mmdb: 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb'
  },
  'global-ua': 'chrome',
  profile: {
    'store-selected': true,
    'store-fake-ip': true
  }
})

export const TunConfigDefaults: ProfileType['tunConfig'] = {
  // System proxy is supported, which is simpler than tun mode
  // Of course I prefer tun mode (*v*)
  enable: false,
  stack: 'System',
  'auto-route': true,
  'auto-detect-interface': false,
  'dns-hijack': ['any:53' /* '198.18.0.2:53' */],
  device: 'Internet',
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

export const ProxyGroupsConfigDefaults = (): ProfileType['proxyGroupsConfig'] => {
  const id1 = sampleID() // 🚀 节点选择
  const id2 = sampleID() // 🎈 自动选择
  const id3 = sampleID() // 🎯 全球直连
  const id4 = sampleID() // 🛑 全球拦截
  const id5 = sampleID() // 🐟 漏网之鱼

  return [
    {
      id: id1,
      name: '🚀 节点选择',
      type: ProxyGroup.Select,
      proxies: [{ id: id2, type: 'Built-In', name: '🎈 自动选择' }],
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
      id: id2,
      name: '🎈 自动选择',
      type: ProxyGroup.UrlTest,
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
      id: id3,
      name: '🎯 全球直连',
      type: ProxyGroup.Select,
      proxies: [
        { id: 'DIRECT', type: 'Built-In', name: 'DIRECT' },
        { id: 'REJECT', type: 'Built-In', name: 'REJECT' }
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
      id: id4,
      name: '🛑 全球拦截',
      type: ProxyGroup.Select,
      proxies: [
        { id: 'REJECT', type: 'Built-In', name: 'REJECT' },
        { id: 'DIRECT', type: 'Built-In', name: 'DIRECT' }
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
      id: id5,
      name: '🐟 漏网之鱼',
      type: ProxyGroup.Select,
      proxies: [
        { id: id1, type: 'Built-In', name: '🚀 节点选择' },
        { id: id3, type: 'Built-In', name: '🎯 全球直连' }
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
}

export const RulesConfigDefaults = (): ProfileType['rulesConfig'] => [
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'category-ads-all',
    proxy: '🛑 全球拦截',
    'no-resolve': false,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'GEOIP',
    payload: 'private',
    proxy: '🎯 全球直连',
    'no-resolve': true,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'GEOIP',
    payload: 'CN',
    proxy: '🎯 全球直连',
    'no-resolve': true,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'private',
    proxy: '🎯 全球直连',
    'no-resolve': false,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'CN',
    proxy: '🎯 全球直连',
    'no-resolve': false,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'GEOSITE',
    payload: 'geolocation-!cn',
    proxy: '🚀 节点选择',
    'no-resolve': false,
    filter: '',
    path: ''
  },
  {
    id: sampleID(),
    type: 'MATCH',
    payload: '',
    proxy: '🐟 漏网之鱼',
    'no-resolve': false,
    filter: '',
    path: ''
  }
]
