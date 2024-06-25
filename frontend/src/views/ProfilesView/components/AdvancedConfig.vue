<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { type ProfileType } from '@/stores'
import {
  FindProcessModeOptions,
  GeodataLoaderOptions,
  GeoSiteMatcherOptions,
  GlobalClientFingerprintOptions,
  AdvancedConfigDefaults
} from '@/constant'

interface Props {
  profile: ProfileType
}

const props = defineProps<Props>()

const fields = defineModel<ProfileType['advancedConfig']>({ default: AdvancedConfigDefaults() })

const { t } = useI18n()
</script>

<template>
  <div class="form-item">
    {{ t('kernel.port') }}
    <Input v-model="fields.port" :min="0" :max="65535" type="number" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.socks-port') }}
    <Input v-model="fields['socks-port']" :min="0" :max="65535" type="number" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.external-controller') }}
    <Input v-model="fields['external-controller']" placeholder="127.0.0.1:9090" editable />
  </div>
  <div class="form-item">
    {{ t('kernel.secret') }}
    <Input v-model="fields.secret" editable />
  </div>
  <div class="form-item" :class="{ 'flex-start': fields.authentication.length !== 0 }">
    {{ t('kernel.authentication') }}
    <InputList v-model="fields.authentication" placeholder="username:password" />
  </div>
  <div class="form-item" :class="{ 'flex-start': fields['skip-auth-prefixes'].length !== 0 }">
    {{ t('kernel.skip-auth-prefixes') }}
    <InputList v-model="fields['skip-auth-prefixes']" placeholder="127.0.0.1/8" />
  </div>
  <div
    v-show="props.profile.generalConfig['allow-lan']"
    :class="{ 'flex-start': fields['lan-allowed-ips'].length !== 0 }"
    class="form-item"
  >
    {{ t('kernel.lan-allowed-ips') }}
    <InputList v-model="fields['lan-allowed-ips']" placeholder="127.0.0.1/8" />
  </div>
  <div
    v-show="props.profile.generalConfig['allow-lan']"
    :class="{ 'flex-start': fields['lan-disallowed-ips'].length !== 0 }"
    class="form-item"
  >
    {{ t('kernel.lan-disallowed-ips') }}
    <InputList v-model="fields['lan-disallowed-ips']" placeholder="192.168.0.3/32" />
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
  <template v-if="fields['geodata-mode']">
    <div class="form-item">
      {{ t('kernel.geodata-loader') }}
      <Radio v-model="fields['geodata-loader']" :options="GeodataLoaderOptions" />
    </div>
    <div class="form-item">
      {{ t('kernel.geosite-matcher.name') }}
      <Radio v-model="fields['geosite-matcher']" :options="GeoSiteMatcherOptions" />
    </div>
    <div class="form-item">
      {{ t('kernel.geo-auto-update') }}
      <Switch v-model="fields['geo-auto-update']" />
    </div>
    <div v-if="fields['geo-auto-update']" class="form-item">
      {{ t('kernel.geo-update-interval') }} ({{ t('format.hours') }})
      <Input
        v-model="fields['geo-update-interval']"
        :min="1"
        :max="24"
        :placeholder="t('format.hours')"
        editable
        type="number"
      />
    </div>
    <div class="form-item">
      {{ t('kernel.geox-url.geoip') }}
      <Input v-model="fields['geox-url']['geoip']" editable />
    </div>
    <div class="form-item">
      {{ t('kernel.geox-url.geosite') }}
      <Input v-model="fields['geox-url']['geosite']" editable />
    </div>
    <div class="form-item">
      {{ t('kernel.geox-url.mmdb') }}
      <Input v-model="fields['geox-url']['mmdb']" editable />
    </div>
    <div class="form-item">
      {{ t('kernel.geox-url.asn') }}
      <Input v-model="fields['geox-url']['asn']" editable />
    </div>
  </template>

  <div class="form-item">
    {{ t('kernel.global-ua') }}
    <Input v-model="fields['global-ua']" editable />
  </div>
</template>

<style lang="less" scoped>
.flex-start {
  align-items: flex-start;
}
</style>
