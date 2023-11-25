<script setup lang="ts"></script>

<template>
  <div class="content">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
</template>

<style scoped>
.content {
  overflow-y: auto;
  margin-top: 8px;
  padding: 0 8px;
}
</style>
