<script lang="ts" setup>
import { ref, computed, isVNode, h } from 'vue'

import vMenu from '@/directives/menu'
import useI18n from '@/lang'
import { getValue } from '@/utils'

import type { Menu } from '@/types/app'

export type Column = {
  title: string
  key: string
  align?: 'center' | 'left' | 'right'
  hidden?: boolean
  minWidth?: string
  sort?: (a: Record<string, any>, b: Record<string, any>) => number
  customRender?: (v: { value: any; record: Record<string, any> }) => any
}

interface Props {
  menu?: Menu[]
  columns: Column[]
  dataSource: Record<string, any>[]
  sort?: string
}

const props = withDefaults(defineProps<Props>(), {
  menu: () => [],
})

const sortField = ref(props.sort)
const sortReverse = ref(true)
const sortFunc = computed(
  () => props.columns.find((column) => column.key === sortField.value)?.sort,
)

const { t } = useI18n.global

const handleChangeSortField = (field: string) => {
  if (sortField.value === field) {
    if (sortReverse.value) {
      sortReverse.value = false
      return
    }
    sortField.value = ''
    sortReverse.value = true
    return
  }
  sortField.value = field
  sortReverse.value = true
}

const tableData = computed(() => {
  if (!sortField.value || !sortFunc.value) return props.dataSource
  const sorted = props.dataSource.slice().sort(sortFunc.value)
  if (sortReverse.value) sorted.reverse()
  return sorted
})

const tableColumns = computed(() => {
  return props.columns.filter((column) => !column.hidden)
})

const renderCell = (column: Column, record: Recordable) => {
  const value = getValue(record, column.key)
  let result = column.customRender?.({ value, record }) ?? value ?? '-'
  if (!isVNode(result)) {
    result = h('div', result)
  }
  return result
}
</script>

<template>
  <div class="table">
    <table>
      <thead>
        <tr>
          <th v-for="column in tableColumns" :key="column.key">
            <div
              @click="handleChangeSortField(column.key)"
              :style="{
                justifyContent: { left: 'flext-start', center: 'center', right: 'flex-end' }[
                  column.align || 'left'
                ],
                minWidth: column.minWidth || 'auto',
              }"
              class="title"
            >
              {{ t(column.title) }}
              <div v-if="sortField === column.key && sortFunc">
                <span class="title-sort"> {{ sortReverse ? '↑' : '↓' }} </span>
              </div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in tableData"
          v-menu="menu.map((v) => ({ ...v, handler: () => v.handler?.(record) }))"
          :key="record.id"
        >
          <td
            v-for="column in tableColumns"
            :key="column.key"
            :style="{ textAlign: column.align || 'left' }"
            class="select-text"
          >
            <slot :name="column.key" :="{ column, record }">
              <component :is="renderCell(column, record)" />
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="less" scoped>
.table {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
  thead {
    tr {
      position: sticky;
      top: 0;
      background: var(--table-tr-odd-bg);
      box-shadow: 0 4px 4px rgba(0, 0, 0, 0.1);
      th {
        padding: 8px 4px;
        white-space: nowrap;
        cursor: pointer;
        .title {
          display: flex;
          align-items: center;
          &-sort {
            padding: 0 4px;
          }
        }
      }
    }
  }
  tbody {
    tr {
      transition: all 0.2s;
      &:nth-child(odd) {
        background: var(--table-tr-odd-bg);
        &:hover {
          background: var(--table-tr-odd-hover-bg);
        }
      }
      &:nth-child(even) {
        background: var(--table-tr-even-bg);
        &:hover {
          background: var(--table-tr-even-hover-bg);
        }
      }
      td {
        padding: 8px;
        white-space: nowrap;
      }
    }
  }
}
</style>
