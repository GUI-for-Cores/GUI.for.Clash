<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useKernelApiStore } from '@/stores'
import { useBool } from '@/hooks'

const { t } = useI18n()
const [show, toggleShow] = useBool(false)
const kernelApiStore = useKernelApiStore()

const onPortSubmit = (port: number) => kernelApiStore.updateConfig({ port })
const onSocksPortSubmit = (port: number) => kernelApiStore.updateConfig({ 'socks-port': port })
const onMixedPortSubmit = (port: number) => kernelApiStore.updateConfig({ 'mixed-port': port })
const onAllowLanChange = (allow: boolean) => kernelApiStore.updateConfig({ 'allow-lan': allow })
</script>

<template>
  <div class="common">
    <Button @click="toggleShow" type="link" class="more">{{ t('common.more') }}</Button>
    <div v-show="show" class="card-ist">
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
      <Card :title="t('kernel.allow-lan')" class="card-item">
        <div style="width: 100%; text-align: right">
          <Switch v-model="kernelApiStore.config['allow-lan']" @change="onAllowLanChange" />
        </div>
      </Card>
    </div>
  </div>
</template>

<style lang="less" scoped>
.more {
  margin-left: auto;
}
.card-ist {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 8px;
  .card-item {
    width: 24%;
  }
}
</style>
