import type { Plugin, App } from 'vue'

import menu from './menu'

const directives: any = {
  menu
}

export default {
  install(app: App) {
    Object.keys(directives).forEach((key) => {
      app.directive(key, directives[key])
    })
  }
} as Plugin
