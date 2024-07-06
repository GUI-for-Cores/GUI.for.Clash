<script lang="ts" setup>
import { ref } from 'vue'

import icons from '@/components/Icon/icons'
import { APP_TITLE, APP_VERSION, sleep } from '@/utils'
import { HttpGet, HttpPost, Upload, Notify } from '@/bridge'
import { useMessage, usePicker, useConfirm, usePrompt, useAlert } from '@/hooks'

const code = ref(`
const appName = '${APP_TITLE}'
const appVersion = '${APP_VERSION}'
`)

const kv = ref({
  appTitle: APP_TITLE,
  appVersion: APP_VERSION,
  count: '1'
})

const { message } = useMessage()
const { picker } = usePicker()
const { confirm } = useConfirm()
const { prompt } = usePrompt()
const { alert } = useAlert()

const handleUpdateMessage = async () => {
  const { id } = message.info('Loading', 5_000)
  await sleep(1000)
  message.update(id, 'success', 'success')
  await sleep(1000)
  message.destroy(id)
}

const handleShowSinglePicker = async () => {
  try {
    const res = await picker.single(
      'Single',
      [
        { label: 'ONE', value: 'one', description: 'The first option' },
        { label: 'TWO', value: 'two' },
        { label: 'THREE', value: 'three', description: 'The third option' }
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
        { label: 'ONE', value: 'one', description: 'The first option' },
        { label: 'TWO', value: 'two' },
        { label: 'THREE', value: 'three', description: 'The third option' }
      ],
      ['one', 'three']
    )
    console.log(res)
  } catch (error: any) {
    message.info(error)
  }
}

const handleShowConfirm = async () => {
  try {
    const res = await confirm('Title', 'Message\nline1\nline3')
    console.log(res)
  } catch (error: any) {
    message.info(error)
  }
}

const handleShowPrompt = async () => {
  try {
    const res = await prompt('Title', 10 /* 'initialValue' */, {
      max: 100,
      min: 20,
      placeholder: 'placeholder'
    })
    console.log(res)
  } catch (error: any) {
    message.info(error)
  }
}

const handleShowAlert = async () => {
  await alert('Title', 'message')
}
const handleGetText = async () => {
  const res = await HttpGet('http://127.0.0.1:8080/text', { 'Content-Type': 'application/json' })
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + res.body)
}

const handleGetJson = async () => {
  const res = await HttpGet('http://127.0.0.1:8080/json')
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handlePostJSON = async () => {
  const res = await HttpPost(
    'http://127.0.0.1:8080/json',
    { Authorization: 'bearer', 'Content-Type': 'application/json' },
    { username: 'admin' }
  )
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handlePostFORM = async () => {
  const res = await HttpPost(
    'http://127.0.0.1:8080/form',
    { Authorization: 'bearer', 'Content-Type': 'application/x-www-form-urlencoded' },
    { username: 'admin' }
  )
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handleUpload = async () => {
  const res = await Upload('http://127.0.0.1:8080/upload', 'data/user.yaml', {
    Authorization: 'bearer token'
  })
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handleNotify = (type: string) => {
  Notify('Notification', 'test', type)
}
</script>

<template>
  <h2>Icons</h2>
  <div class="icons">
    <Icon
      v-for="icon in icons"
      v-tips.fast="icon"
      :key="icon"
      :icon="icon"
      :size="32"
      class="icon"
    />
  </div>

  <h2>CodeViewer</h2>
  <CodeViewer v-model="code" lang="javascript" editable />

  <h2>Components</h2>
  <div>
    <KeyValueEditor v-model="kv" />
  </div>

  <h2>useMessage & usePicker & useConfirm & usePrompt</h2>
  <div>
    <Button @click="message.info('info', 1_000)" icon="messageInfo"> Info </Button>
    <Button @click="message.warn('warn', 1_000)" icon="messageWarn"> Warn </Button>
    <Button @click="message.error('error', 1_000)" icon="messageError"> Error </Button>
    <Button @click="message.success('success', 1_000)" icon="messageSuccess"> Success </Button>
    <Button @click="handleUpdateMessage">Update Me</Button>
  </div>
  <div>
    <Button @click="handleShowSinglePicker">Single Picker</Button>
    <Button @click="handleShowMultiPicker">Multi Picker</Button>
    <Button @click="handleShowConfirm">Confirm</Button>
    <Button @click="handleShowPrompt">Prompt</Button>
    <Button @click="handleShowAlert">Alert</Button>
  </div>

  <h2>HTTP</h2>
  <div>
    <Button @click="handleGetText">HttpGet Text</Button>
    <Button @click="handleGetJson">HttpGet Json</Button>
    <Button @click="handlePostJSON">HttpPost JSON</Button>
    <Button @click="handlePostFORM">HttpPost FORM</Button>
    <Button @click="handleUpload">Upload</Button>
  </div>

  <h2>Notify</h2>
  <div>
    <Button @click="handleNotify('success')">Success</Button>
    <Button @click="handleNotify('error')">Error</Button>
    <Button @click="handleNotify('')">Normal</Button>
  </div>
</template>

<style lang="less" scoped>
.icons {
  .icon {
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
