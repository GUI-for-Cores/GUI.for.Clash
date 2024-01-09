<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { ref, computed, inject } from 'vue'

import { useBool, useMessage } from '@/hooks'
import { ProxyTypeOptions } from '@/constant'
import { deepClone, ignoredError, sampleID } from '@/utils'
import { ClipboardSetText, Readfile, Writefile } from '@/utils/bridge'
import { type Menu, type SubscribeType, useSubscribesStore } from '@/stores'

interface Props {
  sub: SubscribeType
}

const props = defineProps<Props>()

let editId = ''
const isEdit = ref(false)
const loading = ref(false)
const keywords = ref('')
const proxyType = ref('')
const details = ref()
const allFieldsProxies = ref()
const sub = ref(deepClone(props.sub))

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
        isEdit.value = false
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
    label: 'common.edit',
    handler: async (record: SubscribeType['proxies'][0]) => {
      try {
        const proxy = await getProxyByName(record.name)
        details.value = stringify(proxy)
        isEdit.value = true
        editId = record.name
        toggleDetails()
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

const handleCancel = inject('cancel') as any
const handleSubmit = inject('submit') as any

const handleSave = async () => {
  loading.value = true
  try {
    const { path, proxies, id } = sub.value
    await initAllFieldsProxies()
    const filteredProxies = allFieldsProxies.value.filter((v: any) =>
      proxies.some((vv) => vv.name === v.name)
    )
    await Writefile(path, stringify({ proxies: filteredProxies }))
    await subscribeStore.editSubscribe(id, sub.value)
    handleSubmit()
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

const handleAdd = async () => {
  editId = ''
  details.value = ''
  isEdit.value = true
  toggleDetails()
}

const onEditEnd = async () => {
  let proxy: any
  try {
    proxy = parse(details.value)
  } catch (error: any) {
    console.log(error)
    message.info(error.message)
  }

  if (!proxy) return

  await initAllFieldsProxies()

  const allFieldsProxiesIdx = allFieldsProxies.value.findIndex((v: any) => v.name === editId)
  const subProxiesIdx = sub.value.proxies.findIndex((v) => v.name === editId)

  if (allFieldsProxiesIdx !== -1 && subProxiesIdx !== -1) {
    allFieldsProxies.value.splice(allFieldsProxiesIdx, 1, proxy)
    sub.value.proxies.splice(subProxiesIdx, 1, {
      ...sub.value.proxies[subProxiesIdx],
      name: proxy.name
    })
  } else {
    allFieldsProxies.value.push(proxy)
    sub.value.proxies.push({
      id: sampleID(),
      name: proxy.name,
      type: proxy.type
    })
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
      <Button @click="resetForm" class="ml-8">
        {{ t('common.reset') }}
      </Button>
      <Button @click="handleAdd" type="primary" class="ml-auto">
        {{ t('subscribes.proxies.add') }}
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
      <Button @click="handleSave" :loading="loading" type="primary">
        {{ t('common.save') }}
      </Button>
    </div>
  </div>

  <Modal
    v-model:open="showDetails"
    :submit="isEdit"
    :cancel="isEdit"
    :mask-closable="!isEdit"
    :title="isEdit ? (details ? 'common.edit' : 'common.add') : 'common.details'"
    @ok="onEditEnd"
    cancel-text="common.close"
    max-height="80"
    max-width="80"
  >
    <CodeViewer v-model="details" :editable="isEdit" />
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

.ml-8 {
  margin-left: 8px;
}

.ml-auto {
  margin-left: auto;
}

.action {
  display: flex;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
