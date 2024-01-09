<script lang="ts" setup>
import { ref } from 'vue'

const code = ref(/*javascript*/ `
const message = 'hhhhhhhhhhhh' 
console.log(message)
`)

const reset = () => (code.value = '')
</script>

<template>
  <h2>Code</h2>
  <pre>{{ code }}</pre>
  <CodeViewer v-model="code" editable />

  <Button @click="reset">Reset</Button>
</template>

<style lang="less" scoped></style>
