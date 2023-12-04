import { type Directive, type DirectiveBinding } from 'vue'
import { useApp } from '@/stores'
import { debounce } from '@/utils'

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const appStore = useApp()

    const show = debounce((x: number, y: number) => {
      appStore.tipsPosition = { x, y }
      appStore.tipsMessage = binding.value
      appStore.tipsShow = true
    }, 1000)

    el.onmouseenter = (e: MouseEvent) => {
      show(e.clientX, e.clientY)
    }

    el.onmouseleave = () => {
      appStore.tipsMessage = binding.value
      appStore.tipsShow = false
      show.cancel()
    }
  }
} as Directive
