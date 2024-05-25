<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CodeMirror from 'vue-codemirror6'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion } from '@codemirror/autocomplete'

import { Theme } from '@/constant'
import { getCompletions } from '@/utils'
import { useAppSettingsStore } from '@/stores'

interface Props {
  editable?: boolean
  lang?: 'json' | 'javascript' | 'yaml'
}

const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<Props>(), {
  lang: 'json'
})

const ready = ref(false)

const lang = { json, javascript, yaml }[props.lang]()

const appSettings = useAppSettingsStore()

const completion = autocompletion({ override: getCompletions() })

const extensions = computed(() =>
  appSettings.themeMode === Theme.Dark ? [oneDark, completion] : [completion]
)

onMounted(() => setTimeout(() => (ready.value = true), 100))
</script>

<template>
  <CodeMirror
    v-if="ready"
    v-model="model"
    :lang="lang"
    :readonly="!editable"
    :extensions="extensions"
    tab
    basic
    wrap
  />
</template>

<style lang="less" scoped>
:deep(.cm-editor) {
  height: 100%;
}
:deep(.cm-scroller) {
  font-family: monaco, Consolas, Menlo, Courier, monospace;
  font-size: 12px;
}
:deep(.cm-focused) {
  outline: none;
}
</style>
