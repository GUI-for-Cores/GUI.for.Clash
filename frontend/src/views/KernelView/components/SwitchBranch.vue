<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { Branch } from '@/enums/app'
import { useAppSettingsStore, useKernelApiStore } from '@/stores'
import { message } from '@/utils'

const { t } = useI18n()
const appSettings = useAppSettingsStore()
const kernelApiStore = useKernelApiStore()

const handleUseBranch = async (branch: Branch) => {
  appSettings.app.kernel.branch = branch

  if (!appSettings.app.kernel.running) return

  try {
    await kernelApiStore.restartKernel()
    message.success('common.success')
  } catch (error: any) {
    message.error(error)
  }
}
</script>

<template>
  <h3>{{ t('settings.kernel.version') }}</h3>
  <div class="branch">
    <Card
      :selected="appSettings.app.kernel.branch === Branch.Main"
      @click="handleUseBranch(Branch.Main)"
      title="Stable"
      class="branch-item"
    >
      {{ t('settings.kernel.stable') }}
    </Card>
    <Card
      :selected="appSettings.app.kernel.branch === Branch.Alpha"
      @click="handleUseBranch(Branch.Alpha)"
      title="Alpha"
      class="branch-item"
    >
      {{ t('settings.kernel.alpha') }}
    </Card>
  </div>
</template>

<style lang="less" scoped>
.branch {
  display: flex;
  &-item {
    width: 36%;
    margin-right: 8px;
    height: 70px;
    font-size: 12px;
  }
}
</style>
