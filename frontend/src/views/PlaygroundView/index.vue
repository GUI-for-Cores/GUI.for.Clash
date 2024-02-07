<script lang="ts" setup>
import { ref, computed } from 'vue'

import { DraggableOptions, type MenuItem } from '@/constant'
import { useAppStore, useAppSettingsStore } from '@/stores'
import { UpdateTray } from '@/utils/bridge'
import { APP_TITLE, APP_VERSION, sleep } from '@/utils'
import icons from '@/components/Icon/icons'
import { useMessage, usePicker } from '@/hooks'

const list = ref(['data 1', 'data 2', 'data 3', 'data 4'])

const radioValue = ref(list.value[0])
const radioOptions = computed(() => list.value.map((v) => ({ label: v, value: v })))

const code = ref(`
const appName = '${APP_TITLE}'
const appVersion = '${APP_VERSION}'
`)

const kv = ref({
  appTitle: APP_TITLE,
  appVersion: APP_VERSION,
  count: '1'
})

const handleUpdateMenus = async () => {
  const menus: MenuItem[] = [
    {
      type: 'item',
      text: '一级菜单',
      tooltip: '',
      children: [
        {
          type: 'item',
          text: '二级菜单',
          tooltip: '',
          children: [
            {
              type: 'item',
              text: '三级菜单',
              tooltip: '',
              children: [
                {
                  type: 'item',
                  text: '四级菜单',
                  tooltip: '',
                  event: () => {
                    console.log('click')
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]

  // const appStore = useAppStore()
  // appStore.updateTrayMenus()
}

const { message } = useMessage()
const { picker } = usePicker()

const appSettings = useAppSettingsStore()

const theme = appSettings.app.theme

const icos = [
  `data/ico/normal_${theme}.ico`,
  `data/ico/proxy_${theme}.ico`,
  `data/ico/tun_${theme}.ico`
]
let i = 0
const handleUpdateTray = async () => {
  i += 1
  await UpdateTray({
    icon: icos[i % 3]
  })
}

const handleUpdateMessage = async () => {
  const { id } = message.info('success', 5_000)
  await sleep(1000)
  message.update(id, 'error', 'error')
  message.destroy(id)
  await sleep(1000)
  message.update(id, 'success', 'success')
}

const handleShowSinglePicker = async () => {
  try {
    const res = await picker.single(
      'Single',
      [
        { label: 'ONE', value: 'one' },
        { label: 'TWO', value: 'two' },
        { label: 'THREE', value: 'three' }
      ],
      ['one']
    )
    console.log(res)
  } catch (error: any) {
    message.info(error)
  }
}

const handleShowMultiPicker = async () => {
  try {
    const res = await picker.multi(
      'Multi',
      [
        { label: 'ONE', value: 'one' },
        { label: 'TWO', value: 'two' },
        { label: 'THREE', value: 'three' }
      ],
      ['one', 'three']
    )
    console.log(res)
  } catch (error: any) {
    message.info(error)
  }
}
</script>

<template>
  <h2>Icons</h2>
  <div class="icons">
    <Icon v-for="icon in icons" v-tips.fast="icon" :key="icon" :icon="icon" class="icon" />
  </div>

  <h2>CodeViewer</h2>
  <CodeViewer v-model="code" />

  <h2>Drag</h2>
  <div v-draggable="[list, DraggableOptions]" class="drag">
    <div v-for="l in list" :key="l" class="drag-item">
      {{ l }}
    </div>
  </div>

  <h2>Components</h2>
  <div>
    <Radio v-model="radioValue" :options="radioOptions" />
    {{ radioValue }}
    <br />
    <CheckBox v-model="list" :options="icons.map((v) => ({ label: v, value: v })).slice(0, 5)" />
    {{ list }}
    <br />
    <KeyValueEditor v-model="kv" />
    <br />
    kv: {{ kv }}
  </div>

  <h2>Tray Update/Destroy</h2>
  <div>
    <Button @click="handleUpdateMenus" type="link">Update Menus</Button>
    <Button @click="handleUpdateTray" type="link">Update Tray</Button>
  </div>

  <h2>useMessage & usePicker</h2>
  <div>
    <Button @click="message.info('info', 100_000)">
      <Icon icon="messageInfo" />
      Info
    </Button>
    <Button @click="message.warn('warn', 1_000)">
      <Icon icon="messageWarn" />
      Warn
    </Button>
    <Button @click="message.error('error', 1_000)">
      <Icon icon="messageError" />
      Error
    </Button>
    <Button @click="message.success('success', 1_000)">
      <Icon icon="messageSuccess" />
      Success
    </Button>
    <Button @click="handleUpdateMessage">Update Me</Button>
  </div>
  <div><Button @click="handleShowSinglePicker">Single Picker</Button></div>
  <div><Button @click="handleShowMultiPicker">Multi Picker</Button></div>
</template>

<style lang="less" scoped>
.icons {
  .icon {
    width: 32px;
    height: 32px;
    margin: 2px;
    background: var(--card-bg);
  }
}

.drag {
  .drag-item {
    display: inline-block;
    margin: 2px;
    padding: 4px;
    background: var(--card-bg);
  }
}
</style>
