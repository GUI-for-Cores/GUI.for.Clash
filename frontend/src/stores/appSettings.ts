import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parse, stringify } from 'yaml'
import i18n from '@/lang'
import { Theme, WindowStartState, Lang, View, Color, Colors } from '@/constant/app'
import { debounce } from '@/utils'
import { WindowSetDarkTheme, WindowSetLightTheme, Readfile, Writefile } from '@/utils/bridge'

type AppSettings = {
  lang: Lang
  theme: Theme
  color: Color
  profilesView: View
  subscribesView: View
  disableResize: boolean
  windowStartState: WindowStartState
  exitOnClose: boolean
  closeKernelOnExit: boolean
  kernel: {
    profile: string
    pid: number
    running: boolean
    autoClose: boolean
    unAvailable: boolean
  }
}

export const useAppSettingsStore = defineStore('app-settings', () => {
  let firstOpen = true
  let latestUserConfig = ''

  const app = ref<AppSettings>({
    lang: Lang.EN,
    theme: Theme.Auto,
    color: Color.Default,
    profilesView: View.Grid,
    subscribesView: View.Grid,
    disableResize: true,
    windowStartState: WindowStartState.Normal,
    exitOnClose: false,
    closeKernelOnExit: false,
    kernel: {
      profile: '',
      pid: -1,
      running: false,
      autoClose: true,
      unAvailable: true
    }
  })

  const saveAppSettings = debounce((config: string) => {
    console.log('save app settings')
    Writefile('data/user.yaml', config)
  }, 1500)

  const setupAppSettings = async () => {
    try {
      const b = await Readfile('data/user.yaml')
      app.value = Object.assign(app.value, parse(b))
    } catch (error) {
      firstOpen = false
      console.log(error)
    }

    updateAppSettings(app.value)
  }

  const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQueryList.addEventListener('change', ({ matches }) => {
    console.log('onSystemThemeChange')
    app.value.theme === 'auto' && setAppTheme(matches ? 'dark' : 'light')
  })

  const setAppTheme = (theme: 'dark' | 'light') => {
    document.body.setAttribute('theme-mode', theme)
    if (theme === 'dark') WindowSetDarkTheme()
    else WindowSetLightTheme()
  }

  const updateAppSettings = (v: AppSettings) => {
    i18n.global.locale.value = v.lang
    const mode = v.theme === 'auto' ? (mediaQueryList.matches ? 'dark' : 'light') : v.theme
    const { primary, secondary } = Colors[v.color]
    document.documentElement.style.setProperty('--primary-color', primary)
    document.documentElement.style.setProperty('--secondary-color', secondary)
    setAppTheme(mode)
  }

  watch(
    app,
    (v) => {
      updateAppSettings(v)

      if (!firstOpen) {
        const lastModifiedConfig = stringify(v)
        if (latestUserConfig !== lastModifiedConfig) {
          saveAppSettings(lastModifiedConfig).then(() => {
            latestUserConfig = lastModifiedConfig
          })
        } else {
          saveAppSettings.cancel()
        }
      }

      firstOpen = false
    },
    { deep: true }
  )

  return { setupAppSettings, app }
})
