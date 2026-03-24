<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { SnifferDefaults } from '@/constant/profile'
import { useBool } from '@/hooks'
import { type ProfileType } from '@/stores'

const fields = defineModel<ProfileType['sniffer']>({ default: SnifferDefaults() })

const { t } = useI18n()
const [showMore, toggleMore] = useBool(false)
</script>

<template>
  <div class="form-item">
    {{ t('kernel.sniffer.enable') }}
    <Switch v-model="fields.enable" />
  </div>
  <template v-if="fields.enable">
    <div class="form-item">
      {{ t('kernel.sniffer.override-destination') }}
      <Switch v-model="fields['override-destination']" />
    </div>
    <div class="form-item">
      {{ t('kernel.sniffer.force-dns-mapping') }}
      <Switch v-model="fields['force-dns-mapping']" />
    </div>
    <div class="form-item">
      {{ t('kernel.sniffer.parse-pure-ip') }}
      <Switch v-model="fields['parse-pure-ip']" />
    </div>
    <Divider>
      <Button type="text" size="small" @click="toggleMore">
        {{ t('common.more') }}
      </Button>
    </Divider>
    <div v-if="showMore">
      <div class="form-items items-start">
        <div class="mx-8 mb-8 text-14">
          {{ t('kernel.sniffer.sniff.name') }}
        </div>
        <div class="flex flex-col gap-8 px-8">
          <Card title="HTTP">
            <template #extra>
              <Switch v-model="fields.sniff.HTTP.enable" />
            </template>
            <InputList v-model="fields.sniff.HTTP.ports" placeholder="80,8080-8088" />
          </Card>
          <Card title="TLS">
            <template #extra>
              <Switch v-model="fields.sniff.TLS.enable" />
            </template>
            <InputList v-model="fields.sniff.TLS.ports" placeholder="80,8080-8088" />
          </Card>
          <Card title="QUIC">
            <template #extra>
              <Switch v-model="fields.sniff.QUIC.enable" />
            </template>
            <InputList v-model="fields.sniff.QUIC.ports" placeholder="80,8080-8088" />
          </Card>
        </div>
      </div>
      <div class="form-item" :class="{ 'items-start': fields['force-domain'].length }">
        {{ t('kernel.sniffer.force-domain') }}
        <InputList v-model="fields['force-domain']" placeholder="*.google.com" />
      </div>
      <div class="form-item" :class="{ 'items-start': fields['skip-domain'].length }">
        {{ t('kernel.sniffer.skip-domain') }}
        <InputList v-model="fields['skip-domain']" placeholder="*.youtube.com" />
      </div>
      <div class="form-item" :class="{ 'items-start': fields['skip-src-address'].length }">
        {{ t('kernel.sniffer.skip-src-address') }}
        <InputList v-model="fields['skip-src-address']" placeholder="192.168.0.3/32" />
      </div>
      <div class="form-item" :class="{ 'items-start': fields['skip-dst-address'].length }">
        {{ t('kernel.sniffer.skip-dst-address') }}
        <InputList v-model="fields['skip-dst-address']" placeholder="192.168.0.3/32" />
      </div>
    </div>
  </template>
</template>
