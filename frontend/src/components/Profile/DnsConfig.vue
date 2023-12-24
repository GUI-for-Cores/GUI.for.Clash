<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { deepClone } from '@/utils'
import { type ProfileType } from '@/stores'
import { EnhancedModeOptions } from '@/constant'

interface Props {
  modelValue: ProfileType['dnsConfig']
}

const props = withDefaults(defineProps<Props>(), {})

const emits = defineEmits(['update:modelValue'])

const fields = ref(deepClone(props.modelValue))

const { t } = useI18n()

watch(fields, (v) => emits('update:modelValue', v), { immediate: true, deep: true })
</script>

<template>
  <div class="form-item">
    {{ t('kernel.dns.enable') }}
    <Switch v-model="fields.enable" />
  </div>
  <template v-if="fields.enable">
    <div class="form-item">
      {{ t('kernel.dns.prefer-h3') }}
      <Switch v-model="fields['prefer-h3']" />
    </div>
    <div class="form-item">
      {{ t('kernel.dns.ipv6') }}
      <Switch v-model="fields['ipv6']" />
    </div>
    <div class="form-item" :class="{ 'flex-start': fields['default-nameserver'].length !== 0 }">
      {{ t('kernel.dns.default-nameserver') }}
      <InputList v-model="fields['default-nameserver']" />
    </div>
    <div class="form-item" :class="{ 'flex-start': fields['nameserver'].length !== 0 }">
      {{ t('kernel.dns.nameserver') }}
      <InputList v-model="fields['nameserver']" />
    </div>
    <div class="form-item">
      {{ t('kernel.dns.enhanced-mode') }}
      <Radio v-model="fields['enhanced-mode']" :options="EnhancedModeOptions" />
    </div>
    <div v-if="fields['enhanced-mode'] === 'fake-ip'">
      <div class="form-item">
        {{ t('kernel.dns.fake-ip-range') }}
        <Input v-model="fields['fake-ip-range']" editable />
      </div>
      <div class="form-item" :class="{ 'flex-start': fields['fake-ip-filter'].length !== 0 }">
        {{ t('kernel.dns.fake-ip-filter') }}
        <InputList v-model="fields['fake-ip-filter']" />
      </div>
    </div>
  </template>
</template>

<style lang="less" scoped>
.flex-start {
  align-items: flex-start;
}
</style>
