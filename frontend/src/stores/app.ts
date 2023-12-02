import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Menu = {
  label: string
  handler?: (...args: any) => void
}

export const useApp = defineStore('app', () => {
  const menuShow = ref(false)
  const menuPosition = ref({
    x: 0,
    y: 0
  })
  const menuList = ref<Menu[]>([])

  return { menuShow, menuPosition, menuList }
})
