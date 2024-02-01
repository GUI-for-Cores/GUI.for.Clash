<script setup lang="ts">
import i18n from '@/lang'

interface Props {
  icon?: 'info' | 'success' | 'error' | 'warn'
  content: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'info'
})

const { t } = i18n.global

const icon = {
  info: 'messageInfo',
  success: 'messageSuccess',
  error: 'messageError',
  warn: 'messageWarn'
}[props.icon]
</script>

<template>
  <div class="message">
    <Icon :icon="icon" />
    <div class="content">{{ t(content) }}</div>
  </div>
</template>

<style lang="less" scoped>
.message {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  margin: 4px 0;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.2);

  .content {
    font-size: 14px;
    padding: 0 8px;
  }
}
</style>
