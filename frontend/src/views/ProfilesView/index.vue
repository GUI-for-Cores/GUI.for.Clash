<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'
import { type ProfileType, useProfilesStore, useAppSettingsStore } from '@/stores'
import { BrowserOpenURL, Getcwd } from '@/utils/bridge'
import { View } from '@/constant/app'
import { useMessage } from '@/hooks/useMessage'
import ProfileForm from './components/ProfileForm.vue'

const profileID = ref()
const showForm = ref(false)
const isUpdate = ref(false)
const formTitle = computed(() => (isUpdate.value ? t('common.edit') : t('common.add')))

const { t } = useI18n()
const { message } = useMessage()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const handleAddProfile = async () => {
  isUpdate.value = false
  showForm.value = true
}

const handleEditProfile = (p: ProfileType) => {
  isUpdate.value = true
  profileID.value = p.id
  showForm.value = true
}

const handleOpenEdit = async () => {
  const cwd = await Getcwd()
  BrowserOpenURL(cwd + '/data/profiles.yaml')
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
      class="profile"
    >
      <template #title-suffix>
        <Icon @click="handleOpenEdit" icon="edit" style="cursor: pointer" />
      </template>

      <template v-if="appSettingsStore.app.profilesView === View.Grid" #extra>
        <Dropdown>
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
      <div>
        TUN:
        {{ p.tunConfig?.enable ? t('common.enabled') : t('common.disabled') }}
        / DNS:
        {{ p.dnsConfig?.enable ? t('common.enabled') : t('common.disabled') }}
      </div>
    </Card>
  </div>

  <Modal v-model:open="showForm" :title="formTitle" :footer="false" max-height="80">
    <ProfileForm :is-update="isUpdate" :id="profileID" />
  </Modal>
</template>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.empty {
  text-align: center;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profiles {
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  line-height: 1.6;
}

.grid {
  .profile {
    width: calc(33.333333% - 16px);
    margin: 8px;
  }
}
.list {
  .profile {
    width: 100%;
    margin: 8px;
  }
}
</style>
