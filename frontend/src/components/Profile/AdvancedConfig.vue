<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ProfileType } from '@/stores/profiles'
import { deepClone } from '@/utils'
import {
  FindProcessModeOptions,
  GeodataLoaderOptions,
  GlobalClientFingerprintOptions
} from '@/constant/kernel'

interface Props {
  modelValue: ProfileType['advancedConfig']
}

const props = withDefaults(defineProps<Props>(), {})

const emits = defineEmits(['update:modelValue'])

const fields = ref(deepClone(props.modelValue))

const { t } = useI18n()

watch(fields, (v) => emits('update:modelValue', v), { immediate: true })
</script>

<template>
  <div class="form-item">
    {{ t('kernel.port') }}
    <Input v-model="fields.port" type="number" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.socks-port') }}
    <Input v-model="fields['socks-port']" type="number" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.external-controller') }}
    <Input v-model="fields['external-controller']" placeholder="127.0.0.1:9090" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.secret') }}
    <Input v-model="fields.secret" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.external-ui') }}
    <Input v-model="fields['external-ui']" placeholder="ui" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.keep-alive-interval') }}
    <Input v-model="fields['keep-alive-interval']" type="number" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.find-process-mode') }}
    <Radio v-model="fields['find-process-mode']" :options="FindProcessModeOptions" />
  </div>
  <div class="form-item">
    {{ t('kernel.external-controller-tls') }}
    <Input v-model="fields['external-controller-tls']" editable />
  </div>
  <div v-show="fields['external-controller-tls']" class="form-item">
    {{ t('kernel.tls.certificate') }}
    <Input v-model="fields.tls.certificate" editable />
  </div>
  <div v-show="fields['external-controller-tls']" class="form-item">
    {{ t('kernel.tls.private-key') }}
    <Input v-model="fields.tls['private-key']" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.external-ui-name') }}
    <Input v-model="fields['external-ui-name']" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.external-ui-url') }}
    <Input v-model="fields['external-ui-url']" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.global-client-fingerprint') }}
    <Select
      v-model="fields['global-client-fingerprint']"
      :options="GlobalClientFingerprintOptions"
    />
  </div>
  <div class="form-item">
    {{ t('kernel.store-selected') }}
    <Switch v-model="fields.profile['store-selected']" />
  </div>
  <div class="form-item">
    {{ t('kernel.store-fake-ip') }}
    <Switch v-model="fields.profile['store-fake-ip']" />
  </div>
  <div class="form-item">
    {{ t('kernel.unified-delay') }}
    <Switch v-model="fields['unified-delay']" />
  </div>
  <div class="form-item">
    {{ t('kernel.tcp-concurrent') }}
    <Switch v-model="fields['tcp-concurrent']" />
  </div>
  <div class="form-item">
    {{ t('kernel.geodata-mode') }}
    <Switch v-model="fields['geodata-mode']" />
  </div>
  <div v-show="fields['geodata-mode']" class="form-item">
    {{ t('kernel.geodata-loader') }}
    <Radio v-model="fields['geodata-loader']" :options="GeodataLoaderOptions" />
  </div>
  <div v-show="fields['geodata-mode']" class="form-item">
    {{ t('kernel.geox-url.geoip') }}
    <Input v-model="fields['geox-url']['geoip']" editable />
  </div>
  <div v-show="fields['geodata-mode']" class="form-item">
    {{ t('kernel.geox-url.geosite') }}
    <Input v-model="fields['geox-url']['geosite']" editable />
  </div>
  <div v-show="fields['geodata-mode']" class="form-item">
    {{ t('kernel.geox-url.mmdb') }}
    <Input v-model="fields['geox-url']['mmdb']" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.global-ua') }}
    <Input v-model="fields['global-ua']" editable />
  </div>
</template>

<style lang="less" scoped></style>
