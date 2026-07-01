declare namespace App {
  type OS = 'windows' | 'linux' | 'darwin'
  type Lang = 'en' | 'zh'
  type Theme = 'auto' | 'light' | 'dark'
  type Color = 'default' | 'green' | 'purple' | 'custom'
  type View = 'grid' | 'list'
  type WindowStartState = 0 | 2
  type WebviewGpuPolicy = 0 | 1 | 2
  type Branch = 'main' | 'alpha'
  type ControllerCloseMode = 'all' | 'button'
  type RequestProxyMode = 'global' | 'none' | 'system' | 'kernel' | 'custom'
  type PluginTrigger =
    | 'on::enabled'
    | 'on::disabled'
    | 'on::manual'
    | 'on::subscribe'
    | 'on::generate'
    | 'on::startup'
    | 'on::shutdown'
    | 'on::ready'
    | 'on::reload'
    | 'on::core::started'
    | 'on::core::stopped'
    | 'on::before::core::start'
    | 'on::before::core::stop'
    | 'on::tray::update'
  type ScheduledTasksType =
    | 'update::subscription'
    | 'update::ruleset'
    | 'update::plugin'
    | 'update::all::subscription'
    | 'update::all::ruleset'
    | 'update::all::plugin'
    | 'run::plugin'
    | 'run::script'
  type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'HEAD' | 'PATCH'

  type ProxyGroup = 'select' | 'url-test' | 'fallback' | 'load-balance'
  type RulesetBehavior = 'domain' | 'ipcidr' | 'classical'
  type RulesetFormat = 'yaml' | 'mrs'
  type RuleType =
    | 'DOMAIN'
    | 'DOMAIN-SUFFIX'
    | 'DOMAIN-KEYWORD'
    | 'DOMAIN-REGEX'
    | 'IP-CIDR'
    | 'IP-CIDR6'
    | 'IP-ASN'
    | 'SRC-IP-CIDR'
    | 'SRC-PORT'
    | 'DST-PORT'
    | 'PROCESS-NAME'
    | 'PROCESS-PATH'
    | 'RULE-SET'
    | 'LOGIC'
    | 'GEOIP'
    | 'GEOSITE'
    | 'SCRIPT'
    | 'MATCH'
    | 'inline'
    | 'InsertionPoint'

  interface AppEnv {
    appName: string
    appVersion: string
    basePath: string
    appPath: string
    os: OS
    arch: string
    isPrivileged: boolean
  }

  interface TrayContent {
    icon?: string
    title?: string
    tooltip?: string
  }

  interface Menu {
    label: string
    handler?: (...args: any) => void
    separator?: boolean
    children?: Menu[]
  }

  interface MenuItem {
    type: 'item' | 'separator'
    text?: string
    tooltip?: string
    event?: (() => void) | string
    children?: MenuItem[]
    hidden?: boolean
    checked?: boolean
    checkable?: boolean
  }

  type AppSettings = {
    lang: Lang | string
    theme: Theme
    color: Color
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    profilesView: View
    subscribesView: View
    rulesetsView: View
    pluginsView: View
    scheduledtasksView: View
    windowStartState: WindowStartState
    webviewGpuPolicy: WebviewGpuPolicy
    contentProtection: boolean
    width: number
    height: number
    exitOnClose: boolean
    closeKernelOnExit: boolean
    autoSetSystemProxy: boolean
    autoSetSystemDNS: boolean
    requestProxyMode: RequestProxyMode
    customProxy: string
    proxyBypassList: string
    systemProxyServices: string[]
    systemProxyDNS: string
    systemDefaultDNS: string
    autoStartKernel: boolean
    autoRestartKernel: boolean
    userAgent: string
    startupDelay: number
    connections: {
      visibility: Record<string, boolean>
      order: string[]
    }
    kernel: {
      realMemoryUsage: boolean
      branch: Branch
      profile: string
      autoClose: boolean
      unAvailable: boolean
      cardMode: boolean
      cardColumns: number
      sortByDelay: boolean
      testUrl: string
      testTimeout: number
      concurrencyLimit: number
      controllerCloseMode: ControllerCloseMode
      controllerSensitivity: number
      main: {
        env: Recordable
        args: string[]
      }
      alpha: {
        env: Recordable
        args: string[]
      }
    }
    plugins: {
      sources: { enable: boolean; name: string; url: string }[]
    }
    addPluginToMenu: boolean
    addGroupToMenu: boolean
    pluginSettings: Record<string, Record<string, any>>
    githubApiToken: string
    githubDownloadAcceleration: boolean
    githubDownloadMirror: string
    multipleInstance: boolean
    rollingRelease: boolean
    debugOutline: boolean
    debugNoAnimation: boolean
    debugNoRounded: boolean
    debugBorder: boolean
    debugUsePointer: boolean
    pages: string[]
  }

  interface PluginConfiguration {
    id: string
    title: string
    description: string
    key: string
    component:
      | 'CheckBox'
      | 'CodeEditor'
      | 'Input'
      | 'InputList'
      | 'KeyValueEditor'
      | 'Radio'
      | 'Select'
      | 'MultipleSelect'
      | 'Switch'
      | 'ColorPicker'
      | ''
    value: any
    options: any[]
  }

  interface Plugin {
    id: string
    version: string
    name: string
    description: string
    type: 'Http' | 'File'
    url: string
    path: string
    triggers: PluginTrigger[]
    tags: string[]
    hasUI: boolean
    group: string
    menus: Record<string, string>
    context: {
      profiles: Recordable
      subscriptions: Recordable
      rulesets: Recordable
      plugins: Recordable
      scheduledtasks: Recordable
    }
    configuration: PluginConfiguration[]
    disabled: boolean
    status: number // 0: Normal 1: Running 2: Stopped
    // Not Config
    updating?: boolean
    loading?: boolean
    running?: boolean
  }

  interface ScheduledTask {
    id: string
    name: string
    type: ScheduledTasksType
    subscriptions: string[]
    rulesets: string[]
    plugins: string[]
    script: string
    cron: string
    notification: boolean
    disabled: boolean
    lastTime: number
  }

  interface Subscription {
    id: string
    name: string
    useInternal: boolean
    upload: number
    download: number
    total: number
    expire: number
    updateTime: number
    type: 'Http' | 'File' | 'Manual'
    url: string
    website: string
    path: string
    include: string
    exclude: string
    includeProtocol: string
    excludeProtocol: string
    proxyPrefix: string
    requestProxyMode: RequestProxyMode
    customProxy: string
    disabled: boolean
    inSecure: boolean
    proxies: { id: string; name: string; type: string }[]
    requestMethod: RequestMethod
    requestTimeout: number
    header: {
      request: Recordable
      response: Recordable
    }
    script: string
    // Not Config
    updating?: boolean
  }

  interface RuleSet {
    id: string
    name: string
    updateTime: number
    disabled: boolean
    type: 'Http' | 'File' | 'Manual'
    behavior: RulesetBehavior
    format: RulesetFormat
    path: string
    url: string
    count: number
    // Not Config
    updating?: boolean
  }

  interface RulesetHub {
    geosite: string
    geoip: string
    list: { name: string; type: 'geosite' | 'geoip'; description: string; count: number }[]
  }

  interface Profile {
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
      type: ProxyGroup
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
      type: RuleType
      payload: string
      proxy: string
      'no-resolve': boolean
      'ruleset-type': 'file' | 'http' | 'inline'
      'ruleset-name': string
      'ruleset-behavior': RulesetBehavior
      'ruleset-format': RulesetFormat
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

  interface CustomActionApi {
    h: typeof import('vue').h
    ref: typeof import('vue').ref
  }

  type CustomActionProps = Recordable
  type CustomActionSlot = import('vue').VNode | string | number | boolean
  type CustomActionSlots = Recordable<((api: CustomActionApi) => CustomActionSlot) | CustomActionSlot>

  interface CustomAction<P = CustomActionProps, S = CustomActionSlots> {
    id?: string
    component: string
    componentProps?: P | ((api: CustomActionApi) => P)
    componentSlots?: S | ((api: CustomActionApi) => S)
  }

  type CustomActionFn = ((api: CustomActionApi) => CustomAction) & {
    id?: string
  }
}
