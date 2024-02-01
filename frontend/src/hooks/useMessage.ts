import { render, createVNode } from 'vue'
import { APP_TITLE } from '@/utils'

import MessageComp from '@/components/Message/index.vue'

const ID = APP_TITLE + '-toast'

class Message {
  private dom: HTMLElement
  private instances: { [key: string]: HTMLElement }
  private t: any
  constructor() {
    this.dom = document.getElementById(ID) || document.createElement('div')
    this.dom.id = ID
    this.dom.style.cssText = `
      position: fixed;
      z-index: 9999;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
    `
    document.body.appendChild(this.dom)
    this.instances = {}
  }

  public info = (content: string, duration = 3_000) => {
    const msg = createVNode(MessageComp, { icon: 'info', content })
    render(msg, this.dom)
    return {}
  }

  public update = (id: string, msg: string) => {}

  public destroy = (id: string) => {}
}

export const useMessage = () => {
  const message = new Message()

  return { message }
}
