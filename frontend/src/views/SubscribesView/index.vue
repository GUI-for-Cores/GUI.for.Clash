<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'
import { type SubscribeType, type Menu, useSubscribesStore, useAppSettingsStore } from '@/stores'
import { formatBytes, formatRelativeTime } from '@/utils/format'
import { BrowserOpenURL } from '@/utils/bridge'
import { View } from '@/constant/app'
import { useMessage } from '@/hooks/useMessage'
import SubscribeForm from './components/SubscribeForm.vue'
import ProxiesView from './components/ProxiesView.vue'

const showSubForm = ref(false)
const showProxies = ref(false)
const proxiesTitle = ref('')
const subFormSubID = ref()
const subFormIsUpdate = ref(false)
const subFormTitle = computed(() => (subFormIsUpdate.value ? t('common.edit') : t('common.add')))

const menuList: Menu[] = [
  {
    label: 'common.update',
    handler: (p: SubscribeType) => handleUpdateSub(p)
  },
  {
    label: 'subscribes.disableAndEnable',
    handler: (p: SubscribeType) => handleDisableSub(p)
  },
  {
    label: 'subscribes.editProxies',
    handler: (p: SubscribeType) => handleEditProxies(p)
  },
  {
    label: 'common.edit',
    handler: (p: SubscribeType) => handleEditSub(p)
  },
  {
    label: 'common.delete',
    handler: (p: SubscribeType) => handleDeleteSub(p)
  }
]

const { t } = useI18n()
const { message } = useMessage()
const subscribeStore = useSubscribesStore()
const appSettingsStore = useAppSettingsStore()

const handleAddSub = async () => {
  subFormIsUpdate.value = false
  showSubForm.value = true
}

const handleUpdateSubs = async () => {
  try {
    await subscribeStore.updateSubscribes()
    message.info('success')
  } catch (error: any) {
    console.error('updateSubscribes: ', error)
    message.info(error)
  }
}

const handleEditSub = (s: SubscribeType) => {
  subFormIsUpdate.value = true
  subFormSubID.value = s.id
  showSubForm.value = true
}

const handleEditProxies = (s: SubscribeType) => {
  subFormSubID.value = s.id
  proxiesTitle.value = s.name
  showProxies.value = true
}

const handleUpdateSub = async (s: SubscribeType) => {
  try {
    await subscribeStore.updateSubscribe(s.id)
    message.info('success')
  } catch (error: any) {
    console.error('updateSubscribe: ', error)
    message.info(error)
  }
}

const handleDeleteSub = async (s: SubscribeType) => {
  try {
    await subscribeStore.deleteSubscribe(s.id)
    message.info('success')
  } catch (error: any) {
    console.error('deleteSubscribe: ', error)
    message.info(error)
  }
}

const handleDisableSub = async (s: SubscribeType) => {
  s.disabled = !s.disabled
  subscribeStore.editSubscribe(s.id, s)
  message.info('success')
}

const noUpdateNeeded = computed(() => subscribeStore.subscribes.every((v) => v.disabled))

const clacTrafficPercent = (s: any) => ((s.upload + s.download) / s.total) * 100

const clacTrafficStatus = (s: any) => (clacTrafficPercent(s) > 80 ? 'warning' : 'primary')
</script>

<template>
  <div v-if="subscribeStore.subscribes.length !== 0" class="header">
    <Radio
      v-model="appSettingsStore.app.subscribesView"
      :options="[
        { label: 'common.grid', value: View.Grid },
        { label: 'common.list', value: View.List }
      ]"
    />
    <Button
      @click="handleUpdateSubs"
      :disable="noUpdateNeeded"
      :type="noUpdateNeeded ? 'text' : 'link'"
      style="margin-left: auto"
    >
      {{ t('subscribes.updateAll') }}
    </Button>
    <Button @click="handleAddSub" type="primary">
      {{ t('common.add') }}
    </Button>
  </div>

  <div v-if="subscribeStore.subscribes.length === 0" class="empty">
    <Empty>
      <template #description>
        <I18nT keypath="subscribes.empty" tag="p">
          <template #action>
            <Button @click="handleAddSub" type="link">{{ t('common.add') }}</Button>
          </template>
        </I18nT>
      </template>
    </Empty>
  </div>

  <div class="subscribes" :class="appSettingsStore.app.subscribesView">
    <Card
      v-for="s in subscribeStore.subscribes"
      :key="s.name"
      :title="s.name"
      :disabled="s.disabled"
      v-menu="menuList.map((v) => ({ ...v, handler: () => v.handler?.(s) }))"
      class="subscribe"
    >
      <template #title-prefix>
        <Tag v-if="s.updating" color="cyan">
          {{ t('subscribe.updating') }}
        </Tag>
      </template>

      <template #title-suffix>
        <Icon icon="link" @click="BrowserOpenURL(s.website)" style="cursor: pointer" />
      </template>

      <template v-if="appSettingsStore.app.subscribesView === View.Grid" #extra>
        <Dropdown :trigger="['hover', 'click']">
          <Button type="link" size="small">
            {{ t('common.more') }}
          </Button>
          <template #overlay>
            <Button v-if="!s.disabled" type="link" size="small" @click="handleUpdateSub(s)">
              {{ t('common.update') }}
            </Button>
            <Button type="link" size="small" @click="handleEditSub(s)">
              {{ t('common.edit') }}
            </Button>
            <Button type="link" size="small" @click="handleDeleteSub(s)">
              {{ t('common.delete') }}
            </Button>
          </template>
        </Dropdown>
      </template>

      <template v-else #extra>
        <Button v-if="!s.disabled" type="link" size="small" @click="handleUpdateSub(s)">
          {{ t('common.update') }}
        </Button>
        <Button type="link" size="small" @click="handleEditSub(s)">
          {{ t('common.edit') }}
        </Button>
        <Button type="link" size="small" @click="handleDeleteSub(s)">
          {{ t('common.delete') }}
        </Button>
      </template>
      <template v-if="appSettingsStore.app.subscribesView === View.List">
        <div style="margin-bottom: 8px">
          <Progress :percent="clacTrafficPercent(s)" :status="clacTrafficStatus(s)" />
        </div>
        <div>
          {{ t('subscribes.subtype') }}
          :
          {{ s.type }}
        </div>
        <div>
          {{ t('subscribes.proxyCount') }}
          :
          <Button type="text" size="small" @click="handleEditProxies(s)">
            {{ s.proxies.length }}
          </Button>
        </div>
        <div>
          {{ t('subscribes.upload') }}
          :
          {{ s.upload ? formatBytes(s.upload) : '--' }}
          /
          {{ t('subscribes.download') }}
          :
          {{ s.download ? formatBytes(s.download) : '--' }}
          /
          {{ t('subscribes.total') }}
          :
          {{ s.total ? formatBytes(s.total) : '--' }}
        </div>
        <div>
          {{ t('subscribes.expire') }}
          :
          {{ s.expire || '--' }}
          /
          {{ t('subscribes.updateTime') }}
          :
          {{ s.updateTime || '--' }}
        </div>
      </template>
      <template v-else>
        <div class="traffic-detail">
          <div>
            {{ s.upload + s.download ? formatBytes(s.upload + s.download) : '--' }}
            /
            {{ s.total ? formatBytes(s.total) : '--' }}
          </div>
          <Progress
            :percent="clacTrafficPercent(s)"
            :status="clacTrafficStatus(s)"
            type="circle"
            :radius="20"
          />
        </div>
        <div>
          {{ t('subscribes.subtype') }}
          :
          {{ s.type }}
        </div>
        <div>
          {{ t('subscribes.expire') }}
          :
          {{ s.expire ? formatRelativeTime(s.expire) : '--' }}
        </div>
        <div>
          {{ t('subscribes.updateTime') }}
          :
          {{ s.updateTime ? formatRelativeTime(s.updateTime) : '--' }}
        </div>
      </template>
    </Card>
  </div>

  <Modal v-model:open="showSubForm" :title="subFormTitle" max-height="80" :footer="false">
    <SubscribeForm :is-update="subFormIsUpdate" :id="subFormSubID" />
  </Modal>

  <Modal v-model:open="showProxies" :title="proxiesTitle" :footer="false" height="80" width="80">
    <ProxiesView :id="subFormSubID" />
  </Modal>
</template>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 9;
}

.empty {
  text-align: center;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subscribes {
  flex: 1;
  margin-top: 8px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;

  .traffic-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.grid {
  .subscribe {
    display: inline-block;
    width: calc(33.333333% - 16px);
    margin: 8px;
  }
}
.list {
  .subscribe {
    margin: 8px;
  }
}
</style>
