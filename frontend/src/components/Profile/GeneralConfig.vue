<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ProfileType } from '@/stores/profiles'
import { ModeOptions, LogLevelOptions } from '@/constant/kernel'
import { deepClone } from '@/utils'

interface Props {
  modelValue: ProfileType['generalConfig']
}

const props = withDefaults(defineProps<Props>(), {})

const emits = defineEmits(['update:modelValue'])

const fields = ref(deepClone(props.modelValue))

const { t } = useI18n()

watch(fields, (v) => emits('update:modelValue', v), { immediate: true })
</script>

<template>
  <div class="form-item">
    {{ t('kernel.mode') }}
    <Radio v-model="fields.mode" :options="ModeOptions" />
  </div>
  <div class="form-item">
    {{ t('kernel.log-level') }}
    <Radio v-model="fields['log-level']" :options="LogLevelOptions" />
  </div>
  <div class="form-item">
    {{ t('kernel.ipv6') }}
    <Switch v-model="fields.ipv6" />
  </div>
  <div class="form-item">
    {{ t('kernel.allow-lan') }}
    <Switch v-model="fields['allow-lan']" />
  </div>
  <div class="form-item">
    {{ t('kernel.interface-name') }}
    <Input v-model="fields['interface-name']" />
  </div>
  <div class="form-item">
    {{ t('kernel.mixed-port') }}
    <Input v-model="fields['mixed-port']" type="number" editable />
  </div>
</template>

<style lang="less" scoped></style>
