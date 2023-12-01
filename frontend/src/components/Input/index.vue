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
  min?: number
  max?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoSize: false,
  type: 'text',
  editable: false,
  autofocus: false,
  width: '',
  disabled: false
})

const emits = defineEmits(['update:modelValue', 'submit'])

const showEdit = ref(false)
const inputRef = ref<HTMLElement>()

const { t } = useI18n()

const onInput = (e: any) => {
  let val = e.target.value
  if (props.type === 'number') {
    val = Number(val)
    const { min, max } = props
    if (min !== undefined) {
      val = val < min ? min : val
    }
    if (max !== undefined) {
      val = val > max ? max : val
    }
  }
  emits('update:modelValue', val)
}

const showInput = () => {
  showEdit.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const onSubmit = () => {
  props.editable && (showEdit.value = false)
  emits('submit', props.modelValue)
}

onMounted(() => props.autofocus && inputRef.value?.focus())
</script>

<template>
  <div :class="{ disabled }" class="input">
    <div v-if="editable && !showEdit" @click="showInput" class="editable">
      <Icon v-if="disabled" icon="forbidden" />
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
      @blur="onSubmit"
      @keydown.enter="inputRef?.blur"
      ref="inputRef"
    />
  </div>
</template>

<style lang="less" scoped>
.input {
  .editable {
    line-height: 30px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 220px;
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

.disabled {
  pointer-events: none;
}
</style>
