<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProfilesStore } from '@/stores/profiles'
import { type SubscribeType, useSubscribesStore } from '@/stores/subscribes'
import { useMessage } from '@/hooks/useMessage'
import { useBool } from '@/hooks/useBool'
import { deepClone, sampleID } from '@/utils'

interface Props {
  id?: string
  isUpdate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  isUpdate: false
})

let oldSubName = ''

const sub = ref<SubscribeType>({
  id: sampleID(),
  name: '',
  upload: 0,
  download: 0,
  total: 0,
  expire: '',
  updateTime: '',
  type: 'Http',
  url: '',
  website: '',
  path: `data/subscribes/${sampleID()}.yaml`,
  include: '',
  exclude: '',
  disabled: false,
  proxies: []
})

const { t } = useI18n()
const { message } = useMessage()
const [showMore, toggleShowMore] = useBool(false)
const subscribeStore = useSubscribesStore()
const profilesStore = useProfilesStore()

const handleCancel = inject('cancel') as any

const handleSubmit = async () => {
  if (props.isUpdate) {
    try {
      await subscribeStore.editSubscribe(props.id, sub.value)
      updateProfilesReferences()
      handleCancel()
    } catch (error: any) {
      console.error('editSubscribe: ', error)
      message.info(error)
    }
  } else {
    try {
      await subscribeStore.addSubscribe(sub.value)
      handleCancel()
    } catch (error: any) {
      console.error('addSubscribe: ', error)
      message.info(error)
    }
  }
}

const updateProfilesReferences = () => {
  profilesStore.profiles.forEach((profile) => {
    const needUpdate = profile.proxyGroupsConfig.some((group) => group.use.includes(oldSubName))
    if (needUpdate) {
      profile.proxyGroupsConfig.forEach((group) => {
        group.use = group.use.map((v) => (v === oldSubName ? sub.value.name : v))
      })
      try {
        profilesStore.saveProfiles()
      } catch (error) {
        console.log(error)
      }
    }
  })
}

if (props.isUpdate) {
  const s = subscribeStore.getSubscribeById(props.id)
  if (s) {
    oldSubName = s.name
    sub.value = deepClone(s)
  }
}
</script>

<template>
  <div class="subform">
    <div class="form-item row">
      <div class="name">
        {{ t('subscribes.subtype') }}
      </div>
      <Radio
        v-model="sub.type"
        :options="[
          { label: 'subscribe.http', value: 'Http' },
          { label: 'subscribe.file', value: 'File' }
        ]"
      />
    </div>
    <div class="form-item">
      <div class="name">* {{ t('subscribe.name') }}</div>
      <Input v-model="sub.name" auto-size autofocus class="input" />
    </div>
    <div class="form-item">
      <div class="name">* {{ t('subscribe.url') }}</div>
      <Input
        v-model="sub.url"
        :placeholder="sub.type === 'Http' ? 'http(s)://' : 'data/local/{filename}.txt'"
        auto-size
        class="input"
      />
    </div>
    <div class="form-item">
      <div class="name">* {{ t('subscribe.path') }}</div>
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
      <div v-if="sub.type === 'Http'" class="form-item">
        <div class="name">
          {{ t('subscribe.website') }}
        </div>
        <Input v-model="sub.website" placeholder="http(s)://" auto-size class="input" />
      </div>
    </div>
  </div>
  <div class="action">
    <Button @click="handleCancel">{{ t('common.cancel') }}</Button>
    <Button @click="handleSubmit" :disable="!sub.name || !sub.url || !sub.path" type="primary">
      {{ t('common.save') }}
    </Button>
  </div>
</template>

<style lang="less" scoped>
.subform {
  .form-item {
    margin-bottom: 8px;
    .name {
      font-size: 14px;
      padding: 8px 0;
    }
    .input {
      width: 80%;
    }
  }
  .row {
    display: flex;
    align-items: center;
    .name {
      margin-right: 8px;
    }
  }
}
.action {
  display: flex;
  justify-content: flex-end;
}
</style>
