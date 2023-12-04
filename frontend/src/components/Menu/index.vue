<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Menu } from '@/stores'

interface Props {
  position: { x: number; y: number }
  menuList: Menu[]
  modelValue?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: false
})

const emits = defineEmits(['update:modelValue'])

const { t } = useI18n()

const handleClick = (fn: Menu) => {
  fn.handler?.()
  emits('update:modelValue', false)
}

const onClick = () => emits('update:modelValue', false)

onMounted(() => document.addEventListener('click', onClick))
onUnmounted(() => document.removeEventListener('click', onClick))
</script>

<template>
  <div
    v-show="modelValue"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    class="menu"
  >
    <div v-for="menu in menuList" :key="menu.label" @click="handleClick(menu)" class="menu-item">
      {{ t(menu.label) }}
    </div>
  </div>
</template>

<style lang="less" scoped>
.menu {
  position: fixed;
  z-index: 9999;
  background: var(--menu-bg);
  padding: 4px;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 90px;
  text-align: center;
  font-size: 12px;

  .menu-item {
    padding: 4px;
    margin: 4px 0;
    &:hover {
      background: var(--menu-item-hover);
    }
  }
}
</style>
