<script lang="ts" setup>
import { ref } from 'vue'

import { APP_TITLE, APP_VERSION } from '@/utils'

import icons from '@/components/Icon/icons'

const code = ref(`
const appName = '${APP_TITLE}'
const appVersion = '${APP_VERSION}'
`)
</script>

<template>
  <h2>Icons</h2>
  <div class="icons">
    <Icon v-for="icon in icons" v-tips.fast="icon" :key="icon" :icon="icon" class="icon" />
  </div>

  <h2>CodeViewer</h2>
  <CodeViewer v-model="code" />
</template>

<style lang="less" scoped>
.icons {
  .icon {
    width: 32px;
    height: 32px;
    margin: 2px;
    background: var(--card-bg);
  }
}
</style>
