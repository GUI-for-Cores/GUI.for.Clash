<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: string | number
  autoSize?: boolean
  placeholder?: string
  type?: 'number' | 'text'
  editable?: boolean
  autofocus?: boolean
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoSize: false,
  type: 'text',
  editable: false,
  autofocus: false,
  width: ''
})

const emits = defineEmits(['update:modelValue'])

const showEdit = ref(false)
const inputRef = ref<HTMLElement>()

const { t } = useI18n()

const onInput = (e: any) => {
  let val = e.target.value
  if (props.type === 'number') {
    val = Number(val)
  }
  emits('update:modelValue', val)
}

const showInput = () => {
  showEdit.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

onMounted(() => props.autofocus && inputRef.value?.focus())
</script>

<template>
  <div class="input">
    <div v-if="editable && !showEdit" @click="showInput" class="editable">
      {{ modelValue || t('common.none') }}
    </div>
    <input
      v-else
      :class="{ 'auto-size': autoSize }"
      :value="modelValue"
      :placeholder="placeholder"
      :type="type"
      :style="width && 'width: ' + width"
      @input="($event) => onInput($event)"
      @blur="editable && (showEdit = false)"
      ref="inputRef"
    />
  </div>
</template>

<style lang="less" scoped>
.input {
  .editable {
    height: 30px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 220px;
    text-align: right;
  }
  input {
    width: 100%;
    color: var(--input-color);
    display: inline-block;
    padding: 6px 8px;
    border: none;
    border-radius: 4px;
    outline: 1px solid var(--primary-color);
    background: var(--input-bg);
    margin: 1px;
  }
  .auto-size {
    width: calc(100% - 2px);
  }
}
</style>
