<script setup lang="ts">
import { useI18n, I18nT } from 'vue-i18n'

import { debounce } from '@/utils'
import { DraggableOptions, View } from '@/constant'
import { useProfilesStore, useAppSettingsStore } from '@/stores'

const { t } = useI18n()
const profilesStore = useProfilesStore()
const appSettingsStore = useAppSettingsStore()

const handleAddProfile = async () => {}

const onSortUpdate = debounce(profilesStore.saveProfiles, 1000)
</script>

<template>
  <div v-if="profilesStore.profiles.length === 0" class="empty">
    <Empty>
      <template #description>
        <I18nT keypath="profiles.empty" tag="p" scope="global">
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
      style="margin-right: auto"
    />
  </div>

  <div
    v-draggable="[profilesStore.profiles, { ...DraggableOptions, onUpdate: onSortUpdate }]"
    :class="appSettingsStore.app.profilesView"
    class="profiles"
  ></div>
</template>

<style lang="less" scoped>
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
