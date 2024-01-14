import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parse, stringify } from 'yaml'

import i18n from '@/lang'
import { debounce, APP_TITLE, APP_VERSION } from '@/utils'
import { Theme, WindowStartState, Lang, View, Color, Colors } from '@/constant'
import { WindowSetDarkTheme, WindowSetLightTheme, Readfile, Writefile } from '@/utils/bridge'

type AppSettings = {
  lang: Lang
  theme: Theme
  color: Color
  'font-family': string
  profilesView: View
  subscribesView: View
  rulesetsView: View
  pluginsView: View
  windowStartState: WindowStartState
  exitOnClose: boolean
  closeKernelOnExit: boolean
  autoSetSystemProxy: boolean
  autoStartKernel: boolean
  userAgent: string
  startupDelay: number
  kernel: {
    branch: 'main' | 'alpha'
    profile: string
    pid: number
    running: boolean
    autoClose: boolean
    unAvailable: boolean
    cardMode: boolean
  }
}

export const useAppSettingsStore = defineStore('app-settings', () => {
  let firstOpen = true
  let latestUserConfig = ''

  const themeMode = ref<Theme.Dark | Theme.Light>(Theme.Light)

  const app = ref<AppSettings>({
    lang: Lang.EN,
    theme: Theme.Auto,
    color: Color.Default,
    'font-family': '"Microsoft Yahei", "Arial", sans-serif, "Twemoji Mozilla"',
    profilesView: View.Grid,
    subscribesView: View.Grid,
    rulesetsView: View.Grid,
    pluginsView: View.Grid,
    windowStartState: WindowStartState.Normal,
    exitOnClose: true,
    closeKernelOnExit: true,
    autoSetSystemProxy: false,
    autoStartKernel: false,
    userAgent: APP_TITLE + '/' + APP_VERSION,
    startupDelay: 30,
    kernel: {
      branch: 'main',
      profile: '',
      pid: -1,
      running: false,
      autoClose: true,
      unAvailable: true,
      cardMode: true
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
    if (app.value.theme === Theme.Auto) {
      themeMode.value = matches ? Theme.Dark : Theme.Light
      setAppTheme(themeMode.value)
    }
  })

  const setAppTheme = (theme: Theme.Dark | Theme.Light) => {
    document.body.setAttribute('theme-mode', theme)
    if (theme === Theme.Dark) WindowSetDarkTheme()
    else WindowSetLightTheme()
  }

  const updateAppSettings = (v: AppSettings) => {
    i18n.global.locale.value = v.lang
    themeMode.value =
      v.theme === Theme.Auto ? (mediaQueryList.matches ? Theme.Dark : Theme.Light) : v.theme
    const { primary, secondary } = Colors[v.color]
    document.documentElement.style.setProperty('--primary-color', primary)
    document.documentElement.style.setProperty('--secondary-color', secondary)
    document.body.style.fontFamily = v['font-family']
    setAppTheme(themeMode.value)
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

  return { setupAppSettings, app, themeMode }
})
