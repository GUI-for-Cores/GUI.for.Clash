import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getConfigs, setConfigs, getProxies, getProviders } from '@/api/kernel'
import type { KernelApiConfig, Proxy } from '@/api/kernel.schema'

export const useKernelApiStore = defineStore('kernelApi', () => {
  const config = ref<KernelApiConfig>({
    port: 0,
    'mixed-port': 0,
    'socks-port': 0,
    'log-level': '',
    'allow-lan': false,
    mode: '',
    ipv6: false,
    'interface-name': '',
    tun: {
      enable: false,
      stack: 'System',
      'auto-route': true,
      device: ''
    }
  })

  const proxies = ref<Record<string, Proxy>>({})
  const providers = ref<
    Record<
      string,
      {
        name: string
        proxies: Proxy[]
      }
    >
  >({})

  const refreshCofig = async () => {
    config.value = await getConfigs()
  }

  const updateConfig = async (options: Record<string, any>) => {
    await setConfigs(options)
  }

  const refreshProviderProxies = async () => {
    const [{ providers: a }, { proxies: b }] = await Promise.all([getProviders(), getProxies()])
    providers.value = a
    proxies.value = b
  }

  return { config, proxies, providers, refreshCofig, updateConfig, refreshProviderProxies }
})
