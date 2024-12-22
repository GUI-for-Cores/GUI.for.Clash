export enum LogLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Debug = 'debug',
  Silent = 'silent'
}

export enum ClashMode {
  Global = 'global',
  Rule = 'rule',
  Direct = 'direct'
}

export enum TunStack {
  System = 'System',
  GVisor = 'gVisor',
  Mixed = 'Mixed'
}

export enum RulesetFormat {
  Yaml = 'yaml',
  Mrs = 'mrs'
}

export enum RulesetBehavior {
  Domain = 'domain',
  Ipcidr = 'ipcidr',
  Classical = 'classical'
}

export enum ProxyGroup {
  Select = 'select',
  UrlTest = 'url-test',
  Fallback = 'fallback',
  Relay = 'relay',
  LoadBalance = 'load-balance'
}

export enum ProxyGroupType {
  Selector = 'Selector',
  UrlTest = 'URLTest',
  Fallback = 'Fallback',
  Relay = 'Relay',
  LoadBalance = 'LoadBalance'
}

export enum RuleType {
  Domain = 'DOMAIN',
  DomainSuffix = 'DOMAIN-SUFFIX',
  DomainKeyword = 'DOMAIN-KEYWORD',
  DomainRegex = 'DOMAIN-REGEX',
  IpCidr = 'IP-CIDR',
  IpCidr6 = 'IP-CIDR6',
  IpAsn = 'IP-ASN',
  SrcIpCidr = 'SRC-IP-CIDR',
  SrcPort = 'SRC-PORT',
  DstPort = 'DST-PORT',
  ProcessName = 'PROCESS-NAME',
  ProcessPath = 'PROCESS-PATH',
  RuleSet = 'RULE-SET',
  Logic = 'LOGIC',
  Geoip = 'GEOIP',
  Geosite = 'GEOSITE',
  Match = 'MATCH'
}
