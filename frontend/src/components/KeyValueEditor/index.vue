<script lang="ts" setup>
import { ref, watch } from 'vue'

interface Props {
  modelValue: Record<string, string>
}

const props = defineProps<Props>()
const emits = defineEmits(['update:modelValue'])

const keys = ref(Object.keys(props.modelValue))
const values = ref(Object.values(props.modelValue))

const handleDel = (i: number) => {
  keys.value.splice(i, 1)
  values.value.splice(i, 1)
}

const handleAdd = () => {
  keys.value.push('')
  values.value.push('')
}

watch(
  [keys, values],
  ([keys, values]) => {
    const obj = keys.reduce(
      (obj, key, index) => {
        obj[key] = values[index]
        return obj
      },
      {} as Record<string, string>
    )
    emits('update:modelValue', obj)
  },
  { deep: true }
)
</script>

<template>
  <div class="kv-editor">
    <div v-for="(key, i) in keys" :key="i" class="item">
      <Input v-model="keys[i]" placeholder="key" />
      <Button @click="handleDel(i)" type="text" class="ml-4" size="small"> × </Button>
      <Input v-model="values[i]" placeholder="value" />
    </div>
    <Button @click="handleAdd" type="primary" size="small" class="add">+</Button>
  </div>
</template>

<style lang="less" scoped>
.kv-editor {
  padding: 8px;
  display: inline-block;
  flex-direction: column;
  min-width: 408px;
  .item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }
  .ml-4 {
    margin-left: 4px;
  }
  .add {
    margin: 2px -2px;
    display: flex;
  }
}
</style>
