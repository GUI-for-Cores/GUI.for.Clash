<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { updateGEO } from '@/api/kernel'
import { StackOptions } from '@/constant/kernel'
import { useKernelApiStore } from '@/stores'
import { message } from '@/utils'

const { t } = useI18n()
const kernelApiStore = useKernelApiStore()

const createValueWatcher = (
  initialValue: number | string | boolean,
  callback: (value: number | string | boolean) => Promise<void>,
) => {
  let lastValue = initialValue
  return (newValue: number | boolean) => {
    if (newValue !== lastValue) {
      lastValue = newValue
      callback(newValue).catch((e) => message.error(e.message || e))
    }
  }
}

const onPortSubmit = createValueWatcher(kernelApiStore.config.port, (port) =>
  kernelApiStore.updateConfig({ port }),
)
const onSocksPortSubmit = createValueWatcher(kernelApiStore.config['socks-port'], (port) =>
  kernelApiStore.updateConfig({ 'socks-port': port }),
)
const onMixedPortSubmit = createValueWatcher(kernelApiStore.config['mixed-port'], (port) =>
  kernelApiStore.updateConfig({ 'mixed-port': port }),
)
const onAllowLanChange = createValueWatcher(kernelApiStore.config['allow-lan'], (allow) =>
  kernelApiStore.updateConfig({ 'allow-lan': allow }),
)
const conStackChange = createValueWatcher(kernelApiStore.config.tun.stack, (stack) =>
  kernelApiStore.updateConfig({ tun: { stack, enable: kernelApiStore.config.tun.enable } }),
)
const onTunDeviceSubmit = createValueWatcher(kernelApiStore.config.tun.device, (device) =>
  kernelApiStore.updateConfig({ tun: { device, enable: kernelApiStore.config.tun.enable } }),
)
const onInterfaceChange = createValueWatcher(kernelApiStore.config['interface-name'], (name) =>
  kernelApiStore.updateConfig({ 'interface-name': name }),
)

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
  <div>
    <Divider class="w-full mb-8"> {{ t('home.overview.settingsTips') }} </Divider>
    <div class="grid grid-cols-4 gap-8 pb-16">
      <Card :title="t('kernel.mixed-port')">
        <Input
          v-model="kernelApiStore.config['mixed-port']"
          :min="0"
          :max="65535"
          @submit="onMixedPortSubmit"
          type="number"
          :border="false"
          editable
          auto-size
          class="w-full"
        />
      </Card>
      <Card :title="t('kernel.port')">
        <Input
          v-model="kernelApiStore.config.port"
          :min="0"
          :max="65535"
          @submit="onPortSubmit"
          type="number"
          :border="false"
          editable
          auto-size
          class="w-full"
        />
      </Card>
      <Card :title="t('kernel.socks-port')">
        <Input
          v-model="kernelApiStore.config['socks-port']"
          :min="0"
          :max="65535"
          @submit="onSocksPortSubmit"
          type="number"
          :border="false"
          editable
          auto-size
          class="w-full"
        />
      </Card>
      <Card :title="t('kernel.allow-lan')">
        <Switch v-model="kernelApiStore.config['allow-lan']" @change="onAllowLanChange" />
      </Card>
      <Card :title="t('kernel.tun.stack')">
        <Select
          v-model="kernelApiStore.config.tun.stack"
          :options="StackOptions"
          :border="false"
          auto-size
          @change="conStackChange"
        />
      </Card>
      <Card :title="t('kernel.tun.device')">
        <Input
          v-model="kernelApiStore.config.tun.device"
          @submit="onTunDeviceSubmit"
          editable
          :border="false"
          auto-size
          class="w-full"
        />
      </Card>
      <Card :title="t('kernel.interface-name')">
        <InterfaceSelect
          v-model="kernelApiStore.config['interface-name']"
          :border="false"
          auto-size
          @change="onInterfaceChange"
        />
      </Card>
      <Card :title="t('common.update')">
        <Button @click="handleUpdateGEO" size="small" type="text">
          {{ t('home.overview.updateGEO') }}
        </Button>
      </Card>
    </div>
  </div>
</template>
