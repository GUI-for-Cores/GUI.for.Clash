<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { ProxyTypeOptions } from '@/constant'
import { useBool, useMessage } from '@/hooks'
import { deepClone, sampleID, getUserAgent } from '@/utils'
import { type SubscribeType, useSubscribesStore } from '@/stores'

interface Props {
  id?: string
  isUpdate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false
})

const loading = ref(false)

const sub = ref<SubscribeType>({
  id: sampleID(),
  name: '',
  useInternal: false,
  upload: 0,
  download: 0,
  total: 0,
  expire: 0,
  updateTime: 0,
  type: 'Http',
  url: '',
  website: '',
  path: `data/subscribes/${sampleID()}.yaml`,
  include: '',
  exclude: '',
  includeProtocol: '',
  excludeProtocol: '',
  proxyPrefix: '',
  disabled: false,
  inSecure: false,
  userAgent: '',
  healthCheck: {
    enable: false,
    url: 'https://www.gstatic.com/generate_204',
    interval: 300
  },
  proxies: []
})

const { t } = useI18n()
const { message } = useMessage()
const [showMore, toggleShowMore] = useBool(false)
const subscribeStore = useSubscribesStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  loading.value = true

  try {
    if (props.isUpdate) {
      await subscribeStore.editSubscribe(props.id, sub.value)
    } else {
      await subscribeStore.addSubscribe(sub.value)
    }
    handleCancel()
  } catch (error: any) {
    console.error(error)
    message.error(error)
  }

  loading.value = false
}

const resetUserAgent = () => (sub.value.userAgent = '')

if (props.isUpdate) {
  const s = subscribeStore.getSubscribeById(props.id)
  if (s) {
    sub.value = deepClone(s)
  }
}
</script>

<template>
  <div class="form">
    <div class="form-item row">
      <div class="name">
        {{ t('subscribes.subtype') }}
      </div>
      <Radio
        v-model="sub.type"
        :options="[
          { label: 'common.http', value: 'Http' },
          { label: 'common.file', value: 'File' }
        ]"
      />
    </div>
    <div class="form-item">
      <div class="name">{{ t('subscribe.useInternal') }}</div>
      <Switch v-model="sub.useInternal" />
    </div>
    <div class="form-item">
      <div class="name">{{ t('subscribe.name') }} *</div>
      <Input v-model="sub.name" auto-size autofocus class="input" />
    </div>
    <div class="form-item">
      <div class="name">
        {{ t(sub.type === 'Http' ? 'subscribe.url' : 'subscribe.localPath') }} *
      </div>
      <Input
        v-model="sub.url"
        :placeholder="sub.type === 'Http' ? 'http(s)://' : 'data/local/{filename}.txt'"
        auto-size
        class="input"
      />
    </div>
    <div class="form-item">
      <div class="name">{{ t('subscribe.path') }} *</div>
      <Input
        v-model="sub.path"
        placeholder="data/subscribes/{filename}.yaml"
        auto-size
        class="input"
      />
    </div>
    <Divider>
      <Button @click="toggleShowMore" type="text" size="small">
        {{ t('common.more') }}
      </Button>
    </Divider>
    <div v-show="showMore">
      <div class="form-item">
        <div class="name">{{ t('subscribe.include') }}</div>
        <Input v-model="sub.include" placeholder="keyword1|keyword2" auto-size class="input" />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.exclude') }}</div>
        <Input v-model="sub.exclude" placeholder="keyword1|keyword2" auto-size class="input" />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.includeProtocol') }}</div>
        <Input
          v-model="sub.includeProtocol"
          :placeholder="ProxyTypeOptions.map((v) => v.label).join('|')"
          auto-size
          class="input"
        />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.excludeProtocol') }}</div>
        <Input
          v-model="sub.excludeProtocol"
          :placeholder="ProxyTypeOptions.map((v) => v.label).join('|')"
          auto-size
          class="input"
        />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.proxyPrefix') }}</div>
        <Input v-model="sub.proxyPrefix" auto-size class="input" />
      </div>
      <div v-if="sub.type === 'Http'" class="form-item">
        <div class="name">
          {{ t('subscribe.website') }}
        </div>
        <Input v-model="sub.website" placeholder="http(s)://" auto-size class="input" />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.useragent') }}</div>
        <Input v-model="sub.userAgent" :placeholder="getUserAgent()" auto-size>
          <template #extra>
            <Button
              @click="resetUserAgent"
              type="text"
              icon="reset"
              v-tips="t('subscribe.resetUserAgent')"
            />
          </template>
        </Input>
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.inSecure') }}</div>
        <Switch v-model="sub.inSecure" />
      </div>
      <div class="form-item">
        <div class="name">{{ t('subscribe.healthCheck.name') }}</div>
        <Switch v-model="sub.healthCheck.enable" />
      </div>
      <template v-if="sub.healthCheck.enable">
        <div class="form-item">
          <div class="name">{{ t('subscribe.healthCheck.interval') }}</div>
          <Input v-model="sub.healthCheck.interval" type="number" :min="0" />
        </div>
        <div class="form-item">
          <div class="name">{{ t('subscribe.healthCheck.url') }}</div>
          <Input v-model="sub.healthCheck.url" />
        </div>
      </template>
    </div>
  </div>
  <div class="form-action">
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button
      @click="handleSubmit"
      :loading="loading"
      :disabled="!sub.name || !sub.url || !sub.path"
      type="primary"
    >
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.form {
  padding: 0 8px;
  overflow-y: auto;
  max-height: 70vh;
  .name {
    font-size: 14px;
    padding: 8px 8px 8px 0;
    white-space: nowrap;
  }
  .input {
    width: 77%;
  }
  .row {
    display: flex;
    align-items: center;
    .name {
      margin-right: 8px;
    }
  }
}
</style>
