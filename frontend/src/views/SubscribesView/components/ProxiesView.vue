<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useBool, useMessage } from '@/hooks'
import { ProxyTypeOptions } from '@/constant'
import { deepClone, ignoredError } from '@/utils'
import { updateProvidersProxies } from '@/api/kernel'
import { ClipboardSetText, Readfile, Writefile } from '@/utils/bridge'
import {
  type Menu,
  type SubscribeType,
  useSubscribesStore,
  useAppSettingsStore,
  useProfilesStore
} from '@/stores'

interface Props {
  sub?: SubscribeType
}

const props = defineProps<Props>()

const loading = ref(false)
const keywords = ref('')
const proxyType = ref('')
const details = ref()
const allFieldsProxies = ref()
const sub = ref(deepClone(props.sub || ({} as SubscribeType)))

const [showDetails, toggleDetails] = useBool(false)

const keywordsRegexp = computed(() => new RegExp(keywords.value))

const filteredProxyTypeOptions = computed(() => {
  return ProxyTypeOptions.map((v) => {
    const count = sub.value.proxies.filter((vv) => vv.type === v.value).length
    return { ...v, label: v.label + `(${count})`, count }
  }).filter((v) => v.count)
})

const filteredProxies = computed(() => {
  return sub.value.proxies.filter((v) => {
    const hitType = proxyType.value ? proxyType.value === v.type : true
    const hitName = keywordsRegexp.value.test(v.name)
    return hitName && hitType
  })
})

const menus: Menu[] = [
  {
    label: 'common.details',
    handler: async (record: SubscribeType['proxies'][0]) => {
      try {
        const proxy = await getProxyByName(record.name)
        details.value = stringify(proxy)
        toggleDetails()
      } catch (error: any) {
        message.info(error)
      }
    }
  },
  {
    label: 'common.copy',
    handler: async (record: SubscribeType['proxies'][0]) => {
      try {
        const proxy = await getProxyByName(record.name)
        await ClipboardSetText(stringify(proxy))
        message.info('common.copied')
      } catch (error: any) {
        message.info(error)
      }
    }
  },
  {
    label: 'common.delete',
    handler: (record: Record<string, any>) => {
      const idx = sub.value.proxies.findIndex((v) => v.name === record.name)
      if (idx !== -1) {
        sub.value.proxies.splice(idx, 1)
      }
    }
  }
]

const { t } = useI18n()
const { message } = useMessage()
const subscribeStore = useSubscribesStore()
const appSettings = useAppSettingsStore()
const profilesStore = useProfilesStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  loading.value = true
  try {
    const { path, proxies, id } = sub.value
    await initAllFieldsProxies()
    const filteredProxies = allFieldsProxies.value.filter((v: any) =>
      proxies.some((vv) => vv.name === v.name)
    )
    await Writefile(path, stringify({ proxies: filteredProxies }))
    await subscribeStore.editSubscribe(id, sub.value)

    await _updateProvidersProxies(sub.value.id)

    handleCancel()
  } catch (error: any) {
    console.log(error)
    message.info(error)
  }
  loading.value = false
}

const resetForm = () => {
  proxyType.value = ''
  keywords.value = ''
}

const _updateProvidersProxies = async (subID: string) => {
  const { running, profile } = appSettings.app.kernel
  if (running) {
    const _profile = profilesStore.getProfileById(profile)
    if (!_profile) return
    const needUpdate = _profile.proxyGroupsConfig.some((v) => v.use.includes(subID))
    if (needUpdate) {
      await updateProvidersProxies(subID)
    }
  }
}

const initAllFieldsProxies = async () => {
  if (allFieldsProxies.value) return
  const content = (await ignoredError(Readfile, sub.value!.path)) || '{}'
  const { proxies: _proxies = [] } = parse(content)
  allFieldsProxies.value = _proxies
}

const getProxyByName = async (name: string) => {
  await initAllFieldsProxies()
  const proxy = allFieldsProxies.value.find((v: any) => v.name === name)
  if (!proxy) throw 'Proxy Not Found'
  return proxy
}
</script>

<template>
  <div class="proxies-view">
    <div class="form">
      <span class="label">
        {{ t('subscribes.proxies.type') }}
        :
      </span>
      <Select v-model="proxyType" :options="filteredProxyTypeOptions" :border="false" />
      <span class="label">
        {{ t('subscribes.proxies.name') }}
        :
      </span>
      <Input v-model="keywords" :border="false" :delay="500" />
      <Button @click="resetForm" type="primary" style="margin-left: 8px">
        {{ t('common.reset') }}
      </Button>
    </div>
    <div class="proxies">
      <Card
        v-for="proxy in filteredProxies"
        :key="proxy.name"
        :title="proxy.name"
        v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(proxy) }))"
        class="proxy"
      >
        {{ proxy.type }}
      </Card>
    </div>
    <div class="action">
      <Button @click="handleCancel" :disable="loading">
        {{ t('common.cancel') }}
      </Button>
      <Button @click="handleSubmit" :loading="loading" type="primary">
        {{ t('common.save') }}
      </Button>
    </div>
  </div>

  <Modal
    v-model:open="showDetails"
    :submit="false"
    :cancel="false"
    title="common.details"
    cancel-text="common.close"
    max-height="80"
    max-width="80"
    mask-closable
  >
    <CodeViewer :code="details" />
  </Modal>
</template>

<style lang="less" scoped>
.proxies-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.form {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  background-color: var(--modal-bg);
  backdrop-filter: blur(2px);
  .label {
    padding: 0 8px;
    font-size: 12px;
  }
}
.proxies {
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;

  .proxy {
    display: inline-block;
    width: calc(25% - 4px);
    margin: 2px;
  }
}

.action {
  display: flex;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
