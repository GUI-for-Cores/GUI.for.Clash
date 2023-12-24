import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Menu = {
  label: string
  handler?: (...args: any) => void
  separator?: boolean
}

export const useApp = defineStore('app', () => {
  const menuShow = ref(false)
  const menuList = ref<Menu[]>([])
  const menuPosition = ref({
    x: 0,
    y: 0
  })

  const tipsShow = ref(false)
  const tipsMessage = ref('')
  const tipsPosition = ref({
    x: 0,
    y: 0
  })

  return { menuShow, menuPosition, menuList, tipsShow, tipsMessage, tipsPosition }
})
