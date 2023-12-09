<script setup lang="ts">
import { ref, watch } from 'vue'
import { deepClone } from '@/utils'

interface Props {
  modelValue: string[]
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {})

let dragIndex = -1
const value = ref('')
const list = ref(deepClone(props.modelValue))
const inputRef = ref()

const emits = defineEmits(['update:modelValue'])

const handleAdd = () => {
  if (!value.value) return
  list.value.push(value.value)
  value.value = ''
  inputRef.value?.focus()
}

const handleDel = (i: number) => list.value.splice(i, 1)

const onDragStart = (e: any, index: number) => (dragIndex = index)

const onDragEnter = (e: any, index: number) => {
  e.preventDefault()
  if (dragIndex !== index) {
    const source = list.value[dragIndex]
    list.value.splice(dragIndex, 1)
    list.value.splice(index, 0, source)
    dragIndex = index
  }
}

const onDragOver = (e: any) => e.preventDefault()

watch(list, (v) => emits('update:modelValue', v), { immediate: true })
</script>

<template>
  <div class="input-list">
    <TransitionGroup name="drag" tag="div">
      <Card
        v-for="(l, i) in list"
        @dragenter="onDragEnter($event, i)"
        @dragover="onDragOver($event)"
        @dragstart="onDragStart($event, i)"
        :key="l"
        class="list-item"
        draggable="true"
      >
        <div>{{ l }}</div>
        <Button @click="handleDel(i)" type="text" size="small"> × </Button>
      </Card>
    </TransitionGroup>

    <div class="add">
      <Input
        ref="inputRef"
        v-model="value"
        :placeholder="placeholder"
        @keydown.enter="handleAdd"
        type="text"
        auto-size
        autofocus
        style="width: 100%"
      />
      <Button @click="handleAdd" type="primary">+</Button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.input-list {
  display: inline-block;
  border-radius: 4px;

  .list-item {
    display: flex;
    padding: 0 0 0 8px;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    margin: 2px 0;
  }
  .add {
    display: flex;
    align-items: center;
  }
}

.drag-move {
  transition: transform 0.2s;
}
</style>
