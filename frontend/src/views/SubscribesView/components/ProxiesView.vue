<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { type SubscribeType, useSubscribesStore } from '@/stores'
import { ProxyTypeOptions } from '@/constant/kernel'
import { deepClone } from '@/utils'

interface Props {
  id: string
}

const props = defineProps<Props>()

const keywords = ref('')
const proxyType = ref('')
const proxies = ref<SubscribeType['proxies']>([])

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

const handleCancel = inject('cancel') as any

const { t } = useI18n()
const subscribeStore = useSubscribesStore()

const s = subscribeStore.getSubscribeById(props.id)
if (s) {
  proxies.value = deepClone(s.proxies)
}
</script>

<template>
  <div class="proxies-view">
    <div class="form">
      <span style="margin: 0 8px">
        {{ t('subscribes.proxies.type') }}
        :
      </span>
      <Select v-model="proxyType" :options="filteredProxyTypeOptions" :border="false" />
      <span style="margin: 0 8px">
        {{ t('subscribes.proxies.name') }}
        :
      </span>
      <Input v-model="keywords" :border="false" />
      <Button type="primary" style="margin-left: auto">
        {{ t('common.reset') }}
      </Button>
    </div>
    <div class="proxies">
      <Card v-for="proxy in filteredProxies" :key="proxy.name" :title="proxy.name" class="proxy">
        {{ proxy.type }}
      </Card>
    </div>
    <div class="action">
      <Button @click="handleCancel">
        {{ t('common.cancel') }}
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
