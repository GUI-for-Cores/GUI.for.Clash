<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useBool } from '@/hooks'
import { type ProfileType } from '@/stores'
import { EnhancedModeOptions, FakeipFilterMode, DnsConfigDefaults } from '@/constant'

const fields = defineModel<ProfileType['dnsConfig']>({ default: DnsConfigDefaults() })

const { t } = useI18n()
const [showMore, toggleMore] = useBool(false)
</script>

<template>
  <div class="form-item">
    {{ t('kernel.dns.enable') }}
    <Switch v-model="fields.enable" />
  </div>
  <template v-if="fields.enable">
    <div class="form-item">
      {{ t('kernel.dns.ipv6') }}
      <Switch v-model="fields['ipv6']" />
    </div>
    <div class="form-item">
      {{ t('kernel.dns.listen') }}
      <Input v-model="fields['listen']" editable />
    </div>
    <div class="form-item" :class="{ 'flex-start': fields['nameserver'].length !== 0 }">
      {{ t('kernel.dns.nameserver') }}
      <InputList v-model="fields['nameserver']" />
    </div>
    <div class="form-item">
      {{ t('kernel.dns.enhanced-mode') }}
      <Radio v-model="fields['enhanced-mode']" :options="EnhancedModeOptions" />
    </div>
    <Divider>
      <Button type="text" size="small" @click="toggleMore">
        {{ t('common.more') }}
      </Button>
    </Divider>

    <div v-if="showMore">
      <div class="form-item">
        {{ t('kernel.dns.prefer-h3') }}
        <Switch v-model="fields['prefer-h3']" />
      </div>

      <div class="form-item">
        {{ t('kernel.dns.use-system-hosts') }}
        <Switch v-model="fields['use-system-hosts']" />
      </div>
      <div class="form-item">
        {{ t('kernel.dns.use-hosts') }}
        <Switch v-model="fields['use-hosts']" />
      </div>

      <div
        v-if="fields['use-hosts']"
        class="form-item"
        :class="{ 'flex-start': Object.keys(fields['hosts']).length !== 0 }"
      >
        {{ t('kernel.dns.hosts') }}
        <KeyValueEditor
          v-model="fields['hosts']"
          :placeholder="['google.com', '1.1.1.1,8.8.8.8']"
        />
      </div>

      <div class="form-item" :class="{ 'flex-start': fields['default-nameserver'].length !== 0 }">
        {{ t('kernel.dns.default-nameserver') }}
        <InputList v-model="fields['default-nameserver']" />
      </div>

      <div v-if="fields['enhanced-mode'] === 'fake-ip'">
        <div class="form-item">
          {{ t('kernel.dns.fake-ip-range') }}
          <Input v-model="fields['fake-ip-range']" editable />
        </div>
        <div class="form-item">
          {{ t('kernel.dns.fake-ip-filter-mode.name') }}
          <Radio v-model="fields['fake-ip-filter-mode']" :options="FakeipFilterMode" />
        </div>
        <div class="form-item" :class="{ 'flex-start': fields['fake-ip-filter'].length !== 0 }">
          {{ t('kernel.dns.fake-ip-filter') }}
          <InputList v-model="fields['fake-ip-filter']" />
        </div>
      </div>

      <div
        class="form-item"
        :class="{ 'flex-start': fields['proxy-server-nameserver'].length !== 0 }"
      >
        {{ t('kernel.dns.proxy-server-nameserver') }}
        <InputList v-model="fields['proxy-server-nameserver']" />
      </div>

      <div
        class="form-item"
        :class="{ 'flex-start': Object.keys(fields['nameserver-policy']).length !== 0 }"
      >
        {{ t('kernel.dns.nameserver-policy') }}
        <KeyValueEditor
          v-model="fields['nameserver-policy']"
          :placeholder="['google.com', '8.8.8.8,114.114.114.114']"
        />
      </div>

      <div class="form-item" :class="{ 'flex-start': fields['fallback'].length !== 0 }">
        {{ t('kernel.dns.fallback') }}
        <InputList v-model="fields['fallback']" />
      </div>

      <template v-if="fields['fallback'].length !== 0">
        <div class="form-item flex-start">
          {{ t('kernel.dns.fallback-filter.name') }}
          <div style="width: 70%">
            <div class="form-item">
              {{ t('kernel.dns.fallback-filter.geoip') }}
              <Switch v-model="fields['fallback-filter'].geoip" />
            </div>
            <div class="form-item">
              {{ t('kernel.dns.fallback-filter.geoip-code') }}
              <Input v-model="fields['fallback-filter']['geoip-code']" placeholder="CN" editable />
            </div>
            <div
              class="form-item"
              :class="{ 'flex-start': fields['fallback-filter'].geosite.length !== 0 }"
            >
              {{ t('kernel.dns.fallback-filter.geosite') }}
              <InputList v-model="fields['fallback-filter'].geosite" />
            </div>
            <div
              class="form-item"
              :class="{ 'flex-start': fields['fallback-filter'].ipcidr.length !== 0 }"
            >
              {{ t('kernel.dns.fallback-filter.ipcidr') }}
              <InputList v-model="fields['fallback-filter'].ipcidr" />
            </div>
            <div
              class="form-item"
              :class="{ 'flex-start': fields['fallback-filter'].domain.length !== 0 }"
            >
              {{ t('kernel.dns.fallback-filter.domain') }}
              <InputList v-model="fields['fallback-filter'].domain" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </template>
</template>

<style lang="less" scoped>
.flex-start {
  align-items: flex-start;
}
</style>
