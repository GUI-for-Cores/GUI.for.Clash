<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'
import { type ProfileType, type Menu, useProfilesStore, useAppSettingsStore } from '@/stores'
import { View } from '@/constant/app'
import { useMessage } from '@/hooks/useMessage'
import ProfileForm from './components/ProfileForm.vue'

const profileID = ref()
const profileStep = ref(0)
const showForm = ref(false)
const isUpdate = ref(false)
const formTitle = computed(() => (isUpdate.value ? t('common.edit') : t('common.add')))

const { t } = useI18n()
const { message } = useMessage()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const menus: Menu[] = [
  'profile.step.name',
  'profile.step.general',
  'profile.step.tun',
  'profile.step.dns',
  'profile.step.groups',
  'profile.step.rules'
].map((v, i) => {
  return {
    label: v,
    handler: (p: ProfileType) => handleEditProfile(p, i)
  }
})

const handleAddProfile = async () => {
  isUpdate.value = false
  showForm.value = true
}

const handleEditProfile = (p: ProfileType, step = 0) => {
  isUpdate.value = true
  profileID.value = p.id
  profileStep.value = step
  showForm.value = true
}

const handleDeleteProfile = async (p: ProfileType) => {
  try {
    await profilesStore.deleteProfile(p.id)
    message.info('success')
  } catch (error: any) {
    console.error('deleteProfile: ', error)
    message.info(error)
  }
}

const handleUseProfile = async (p: ProfileType) => {
  if (appSettingsStore.app.kernel.running) {
    message.info(t('profiles.shouldStop'))
    return
  }
  appSettingsStore.app.kernel.profile = p.name
}
</script>

<template>
  <div v-if="profilesStore.profiles.length === 0" class="empty">
    <Empty>
      <template #description>
        <I18nT keypath="profiles.empty" tag="p">
          <template #action>
            <Button @click="handleAddProfile" type="link">{{ t('common.add') }}</Button>
          </template>
        </I18nT>
      </template>
    </Empty>
  </div>

  <div v-else class="header">
    <Radio
      v-model="appSettingsStore.app.profilesView"
      :options="[
        { label: 'common.grid', value: View.Grid },
        { label: 'common.list', value: View.List }
      ]"
    />
    <Button @click="handleAddProfile" type="primary" style="margin-left: auto">
      {{ t('common.add') }}
    </Button>
  </div>

  <div :class="appSettingsStore.app.profilesView" class="profiles">
    <Card
      v-for="p in profilesStore.profiles"
      :key="p.name"
      :title="p.name"
      :selected="appSettingsStore.app.kernel.profile === p.name"
      @dblclick="handleUseProfile(p)"
      v-menu="menus.map((v) => ({ ...v, handler: () => v.handler?.(p) }))"
      class="profile"
    >
      <template v-if="appSettingsStore.app.profilesView === View.Grid" #extra>
        <Dropdown :trigger="['hover', 'click']">
          <Button type="link" size="small">
            {{ t('common.more') }}
          </Button>
          <template #overlay>
            <Button @click="handleUseProfile(p)" type="link" size="small">
              {{ t('common.use') }}
            </Button>
            <Button @click="handleEditProfile(p)" type="link" size="small">
              {{ t('common.edit') }}
            </Button>
            <Button @click="handleDeleteProfile(p)" type="link" size="small">
              {{ t('common.delete') }}
            </Button>
          </template>
        </Dropdown>
      </template>

      <template v-else #extra>
        <Button @click="handleUseProfile(p)" type="link" size="small">
          {{ t('common.use') }}
        </Button>
        <Button @click="handleEditProfile(p)" type="link" size="small">
          {{ t('common.edit') }}
        </Button>
        <Button @click="handleDeleteProfile(p)" type="link" size="small">
          {{ t('common.delete') }}
        </Button>
      </template>
      <div>
        proxy groups:
        {{ p.proxyGroupsConfig.length }}
        / rules:
        {{ p.rulesConfig.length }}
      </div>
      <div v-if="p.tunConfig.enable || p.dnsConfig.enable">
        TUN:
        {{ p.tunConfig.enable ? t('common.enabled') : t('common.disabled') }}
        / DNS:
        {{ p.dnsConfig.enable ? t('common.enabled') : t('common.disabled') }}
      </div>
      <div>
        Http:
        {{ p.advancedConfig.port || '--' }}
        Socks:
        {{ p.advancedConfig['socks-port'] || '--' }}
        Mixed:
        {{ p.generalConfig['mixed-port'] || '--' }}
      </div>
    </Card>
  </div>

  <Modal v-model:open="showForm" :title="formTitle" :footer="false" max-height="80">
    <ProfileForm :is-update="isUpdate" :id="profileID" :step="profileStep" />
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

.profiles {
  flex: 1;
  margin-top: 8px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
}

.grid {
  .profile {
    display: inline-block;
    width: calc(33.333333% - 16px);
    margin: 8px;
  }
}
.list {
  .profile {
    margin: 8px;
  }
}
</style>
