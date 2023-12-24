<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useMessage } from '@/hooks'
import { ProxyTypeOptions } from '@/constant'
import { deepClone, ignoredError } from '@/utils'
import { Readfile, Writefile } from '@/utils/bridge'
import { updateProvidersProxies } from '@/api/kernel'
import {
  type Menu,
  type SubscribeType,
  useSubscribesStore,
  useAppSettingsStore,
  useProfilesStore
} from '@/stores'

interface Props {
  id: string
}

const props = defineProps<Props>()

const loading = ref(false)
const keywords = ref('')
const proxyType = ref('')
const sub = ref<SubscribeType>()
const proxies = computed(() => sub.value?.proxies || [])

const keywordsRegexp = computed(() => new RegExp(keywords.value))

const filteredProxyTypeOptions = computed(() => {
  return ProxyTypeOptions.map((v) => {
    const count = proxies.value.filter((vv) => vv.type === v.value).length
    return { ...v, label: v.label + `(${count})`, count }
  }).filter((v) => v.count)
})

const filteredProxies = computed(() => {
  return proxies.value.filter((v) => {
    const hitType = proxyType.value ? proxyType.value === v.type : true
    const hitName = keywordsRegexp.value.test(v.name)
    return hitName && hitType
  })
})

const menus: Menu[] = [
  // {
  //   label: 'common.details',
  //   handler: (e: any) => {
  //     console.log(e)
  //   }
  // },
  // {
  //   label: 'Copy(clash)',
  //   handler: (e: any) => {
  //     console.log(e)
  //   }
  // },
  // {
  //   label: 'Copy(v2ray)',
  //   handler: (e: any) => {
  //     console.log(e)
  //   }
  // },
  {
    label: 'common.delete',
    handler: (record: Record<string, any>) => {
      if (!sub.value) return
      const idx = proxies.value.findIndex((v) => v.name === record.name)
      if (idx !== -1) {
        sub.value.proxies.splice(idx, 1)
      }
    }
  }
]

const handleCancel = inject('cancel') as any

const { t } = useI18n()
const { message } = useMessage()
const subscribeStore = useSubscribesStore()
const appSettings = useAppSettingsStore()
const profilesStore = useProfilesStore()

const handleSubmit = async () => {
  if (!sub.value) return
  loading.value = true
  try {
    const { path, proxies, id } = sub.value
    const content = (await ignoredError(Readfile, path)) || '{}'
    const { proxies: _proxies = [] } = parse(content)
    const filteredProxies = _proxies.filter((v: any) => proxies.some((vv) => vv.name === v.name))
    await Writefile(path, stringify({ proxies: filteredProxies }))
    await subscribeStore.editSubscribe(id, sub.value)

    await _updateProvidersProxies(sub.value.name)

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

const _updateProvidersProxies = async (subName: string) => {
  const { running, profile } = appSettings.app.kernel
  if (running) {
    const _profile = profilesStore.getProfileById(profile)
    if (!_profile) return
    const needUpdate = _profile.proxyGroupsConfig.some((v) => v.use.includes(subName))
    if (needUpdate) {
      await updateProvidersProxies(subName)
    }
  }
}

const s = subscribeStore.getSubscribeById(props.id)
if (s) {
  sub.value = deepClone(s)
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
