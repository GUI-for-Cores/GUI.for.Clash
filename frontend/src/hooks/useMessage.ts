import { APP_TITLE } from '@/utils/env'

const ID = APP_TITLE + '-toast'

class Message {
  private dom: HTMLElement
  private instances: { [key: string]: HTMLElement }
  constructor() {
    this.dom = document.getElementById(ID) || document.createElement('div')
    this.dom.id = ID
    this.dom.style.cssText = `
      position: fixed;
      z-index: 9999;
      top: 56px;
      left: 50%;
      transform: translateX(-50%);
    `
    document.body.appendChild(this.dom)
    this.instances = {}
  }

  public info = (msg: string, duration = 3) => {
    const info = document.createElement('div')
    info.style.cssText = `
      transition: all .2s;
      display: block;
      color: var(--color);
      background: var(--bg-color);
      padding: 8px;
      border-radius: 8px;
      margin: 4px 0;
      box-shadow: 0 4px 4px rgba(0, 0, 0, .2);
    `
    const id = 'ID-' + Math.random()
    info.id = id
    info.textContent = msg

    this.instances[id] = info
    this.dom.appendChild(info)

    setTimeout(() => {
      info.remove()
      delete this.instances[id]
    }, duration * 1000)

    return { id }
  }

  public update = (id: string, msg: string) => {
    if (this.instances[id]) {
      this.instances[id].textContent = msg
    }
  }

  public destroy = () => {
    this.dom.remove()
  }
}

export const useMessage = () => {
  const message = new Message()

  return { message }
}
