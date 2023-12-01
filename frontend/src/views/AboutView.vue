<script setup lang="ts">
import { APP_TITLE, APP_VERSION, PROJECT_URL, TG_GROUP, TG_CHANNEL } from '@/utils/env'
import { BrowserOpenURL } from '@/utils/bridge'
</script>

<template>
  <div class="about">
    <img src="@/assets/logo.png" draggable="false" />
    <div class="appname">{{ APP_TITLE }}</div>
    <div class="appver">{{ APP_VERSION }}</div>
    <div @click="BrowserOpenURL(PROJECT_URL)" class="url"><Icon icon="github" />GitHub</div>
    <div @click="BrowserOpenURL(TG_GROUP)" class="url"><Icon icon="telegram" />Telegram Group</div>
    <div @click="BrowserOpenURL(TG_CHANNEL)" class="url">
      <Icon icon="telegram" />Telegram Channel
    </div>
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
    padding: 8px 0;
  }
  .appver {
    font-size: 12px;
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
