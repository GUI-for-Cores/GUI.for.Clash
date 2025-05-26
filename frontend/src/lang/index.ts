import { createI18n } from 'vue-i18n'

import en from './locale/en'
import zh from './locale/zh'

const messages = {
  zh,
  en,
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackWarn: false,
  missingWarn: false,
  messages,
})

export default i18n
