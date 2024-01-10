import { type RouteRecordRaw } from 'vue-router'

import { isDev } from '@/utils'

import HomeView from '@/views/HomeView/index.vue'
import SubscribesView from '@/views/SubscribesView/index.vue'
import SettingsView from '@/views/SettingsView/index.vue'
import ProfilesView from '@/views/ProfilesView/index.vue'
import RulesetsView from '@/views/RulesetsView/index.vue'
import PluginsView from '@/views/PluginsView/index.vue'
import PlaygroundView from '@/views/PlaygroundView/index.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: {
      name: 'router.overview'
    }
  },
  {
    path: '/profiles',
    name: 'Profiles',
    component: ProfilesView,
    meta: {
      name: 'router.profiles'
    }
  },
  {
    path: '/subscriptions',
    name: 'Subscriptions',
    component: SubscribesView,
    meta: {
      name: 'router.subscriptions'
    }
  },
  {
    path: '/rulesets',
    name: 'Rulesets',
    component: RulesetsView,
    meta: {
      name: 'router.rulesets'
    }
  },
  {
    path: '/plugins',
    name: 'PluginsView',
    component: PluginsView,
    meta: {
      name: 'router.plugins',
      hidden: !isDev
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      name: 'router.settings'
    }
  },
  {
    path: '/playground',
    name: 'Playground',
    component: PlaygroundView,
    meta: {
      name: 'Playground',
      hidden: !isDev
    }
  }
]

export default routes
