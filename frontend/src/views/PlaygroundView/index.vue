<script lang="ts" setup>
import { ref } from 'vue'

import { DraggableOptions } from '@/constant'
import { APP_TITLE, APP_VERSION } from '@/utils'

import icons from '@/components/Icon/icons'
const list = ref(['data 1', 'data 2', 'data 3', 'data 4'])

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

  <h2>Drag</h2>
  <div v-draggable="[list, DraggableOptions]" class="drag">
    <div v-for="l in list" :key="l" class="drag-item">
      {{ l }}
    </div>
  </div>
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

.drag {
  .drag-item {
    display: inline-block;
    margin: 2px;
    padding: 4px;
    background: var(--card-bg);
  }
}
</style>
