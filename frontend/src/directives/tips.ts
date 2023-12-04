import { type Directive, type DirectiveBinding } from 'vue'
import { useApp } from '@/stores'
import { debounce } from '@/utils'

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const appStore = useApp()

    let time = 0

    const show = debounce((x: number, y: number) => {
      if (Date.now() - time > 1000) {
        appStore.tipsPosition = { x, y }
        appStore.tipsMessage = binding.value
        appStore.tipsShow = true
      }
    }, 1000)

    el.onmouseenter = (e: MouseEvent) => {
      time = Date.now()
      show(e.clientX, e.clientY)
    }

    el.onmouseleave = () => {
      appStore.tipsShow = false
      show.cancel()
      time = Date.now()
    }
  },
  unmounted() {
    const appStore = useApp()
    appStore.tipsShow = false
  }
} as Directive
