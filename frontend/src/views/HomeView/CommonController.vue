<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useMessage } from '@/hooks'
import { updateGEO } from '@/api/kernel'
import { StackOptions } from '@/constant'
import { useKernelApiStore } from '@/stores'

import InterfaceSelect from '@/components/Profile/InterfaceSelect.vue'

const { t } = useI18n()
const { message } = useMessage()
const kernelApiStore = useKernelApiStore()

const onPortSubmit = (port: number) => kernelApiStore.updateConfig({ port })
const onSocksPortSubmit = (port: number) => kernelApiStore.updateConfig({ 'socks-port': port })
const onMixedPortSubmit = (port: number) => kernelApiStore.updateConfig({ 'mixed-port': port })
const onAllowLanChange = (allow: boolean) => kernelApiStore.updateConfig({ 'allow-lan': allow })
const conStackChange = (stack: string) =>
  kernelApiStore.updateConfig({ tun: { stack, enable: kernelApiStore.config.tun.enable } })
const onTunDeviceSubmit = (device: string) =>
  kernelApiStore.updateConfig({ tun: { device, enable: kernelApiStore.config.tun.enable } })
const onInterfaceChange = (name: string) => kernelApiStore.updateConfig({ 'interface-name': name })

const handleUpdateGEO = async () => {
  try {
    const res = await updateGEO()
    message.success((res && res.message) || 'common.success')
  } catch (error: any) {
    console.log(error)
    message.error(error)
  }
}
</script>

<template>
  <div class="card-list">
    <Divider class="w-100 mb-18">
      {{ t('home.overview.settingsTips') }}
    </Divider>

    <Card :title="t('kernel.mixed-port')" class="card-item">
      <Input
        v-model="kernelApiStore.config['mixed-port']"
        :min="0"
        :max="65535"
        @submit="onMixedPortSubmit"
        type="number"
        editable
      />
    </Card>
    <Card :title="t('kernel.port')" class="card-item">
      <Input
        v-model="kernelApiStore.config.port"
        :min="0"
        :max="65535"
        @submit="onPortSubmit"
        type="number"
        editable
      />
    </Card>
    <Card :title="t('kernel.socks-port')" class="card-item">
      <Input
        v-model="kernelApiStore.config['socks-port']"
        :min="0"
        :max="65535"
        @submit="onSocksPortSubmit"
        type="number"
        editable
      />
    </Card>
    <Card :title="t('kernel.allow-lan')" class="card-item">
      <Switch v-model="kernelApiStore.config['allow-lan']" @change="onAllowLanChange" />
    </Card>

    <div class="w-100 mt-8"></div>

    <Card :title="t('kernel.tun.stack')" class="card-item">
      <Select
        v-model="kernelApiStore.config.tun.stack"
        :options="StackOptions"
        :border="false"
        @change="conStackChange"
      />
    </Card>
    <Card :title="t('kernel.tun.device')" class="card-item">
      <Input v-model="kernelApiStore.config.tun.device" @submit="onTunDeviceSubmit" editable />
    </Card>
    <Card :title="t('kernel.interface-name')" class="card-item">
      <InterfaceSelect
        v-model="kernelApiStore.config['interface-name']"
        @change="onInterfaceChange"
        :border="false"
      />
    </Card>
    <Card :title="t('common.update')" class="card-item">
      <Button @click="handleUpdateGEO" size="small" type="text">
        {{ t('home.overview.updateGEO') }}
      </Button>
    </Card>
  </div>
</template>

<style lang="less" scoped>
.card-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  .card-item {
    width: 24%;
  }
}

.w-100 {
  width: 100%;
}
.mt-8 {
  margin-top: 8px;
}
.mb-18 {
  margin-bottom: 18px;
}
</style>
