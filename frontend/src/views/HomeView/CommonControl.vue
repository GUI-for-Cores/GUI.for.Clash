<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useKernelApiStore } from '@/stores'
import { useBool } from '@/hooks'

const { t } = useI18n()
const [show, toggleShow] = useBool(false)
const kernelApiStore = useKernelApiStore()
</script>

<template>
  <div class="common">
    <Button @click="toggleShow" type="link" class="more">More</Button>
    <div v-show="show" class="card-ist">
      <Card :title="t('kernel.port')" class="card-item">
        <Input v-model="kernelApiStore.config.port" editable />
      </Card>
      <Card :title="t('kernel.socks-port')" class="card-item">
        <Input v-model="kernelApiStore.config['socks-port']" editable />
      </Card>
      <Card :title="t('kernel.mixed-port')" class="card-item">
        <Input v-model="kernelApiStore.config['mixed-port']" editable />
      </Card>
      <Card :title="t('kernel.allow-lan')" class="card-item">
        <Switch v-model="kernelApiStore.config['allow-lan']" />
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
