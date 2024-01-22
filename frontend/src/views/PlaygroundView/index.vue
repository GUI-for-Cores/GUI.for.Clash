<script lang="ts" setup>
import { ref, computed } from 'vue'

import { DraggableOptions } from '@/constant'
import { UnzipGZFile } from '@/utils/bridge'
import { APP_TITLE, APP_VERSION } from '@/utils'

import icons from '@/components/Icon/icons'
const list = ref(['data 1', 'data 2', 'data 3', 'data 4'])

const radioValue = ref(list.value[0])
const radioOptions = computed(() => list.value.map((v) => ({ label: v, value: v })))

const code = ref(`
const appName = '${APP_TITLE}'
const appVersion = '${APP_VERSION}'
`)

const handleUnzip = async () => {
  await UnzipGZFile('data/core.gz', 'core')
}
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

  <h2>Components</h2>
  <div>
    <Radio v-model="radioValue" :options="radioOptions" />
    {{ radioValue }}
    <CheckBox v-model="list" :options="icons.map((v) => ({ label: v, value: v }))" />

    {{ list }}
  </div>

  <h2>Unzip .gz</h2>
  <div>
    <Button @click="handleUnzip">Unzip .gz</Button>
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
