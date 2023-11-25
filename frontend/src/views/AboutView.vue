<script setup lang="ts">
import { APP_TITLE, APP_VERSION, PROJECT_URL } from '@/utils/env'
import { BrowserOpenURL } from '@/utils/bridge'

const openUrl = () => BrowserOpenURL(PROJECT_URL)
</script>

<template>
  <div class="about">
    <img src="@/assets/logo.png" draggable="false" />
    <div class="appname">{{ APP_TITLE }}</div>
    <div class="appver">{{ APP_VERSION }}</div>
    <div @click="openUrl" class="url"><Icon icon="github" />GitHub</div>
  </div>
</template>

<style lang="less" scoped>
.about {
  padding: 22px 0 0 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  .appname {
    font-weight: bold;
    font-size: 16px;
    line-height: 4;
  }
  .appver {
    margin-bottom: 12px;
  }
  .url {
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 12px;
    text-decoration: underline;
  }
}
</style>
