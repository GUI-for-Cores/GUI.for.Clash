import { type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView/index.vue'
import SubscribesView from '@/views/SubscribesView/index.vue'
import SettingsView from '@/views/SettingsView/index.vue'
import ProfilesView from '@/views/ProfilesView/index.vue'

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
    path: '/subscribes',
    name: 'Subscribes',
    component: SubscribesView,
    meta: {
      name: 'router.subscribes'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: {
      name: 'router.settings'
    }
  }
]

export default routes
