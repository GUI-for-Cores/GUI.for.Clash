<script lang="ts" setup>
import { ref } from 'vue'

import { HttpGet, HttpPost, Upload, Notify, Download, HttpCancel } from '@/bridge'
import { APP_TITLE, APP_VERSION, sleep, message, confirm, prompt, picker, alert } from '@/utils'

import icons from '@/components/Icon/icons'

const code = ref(`
const appName = '${APP_TITLE}'
const appVersion = '${APP_VERSION}'
`)

const kv = ref({
  appTitle: APP_TITLE,
  appVersion: APP_VERSION,
  count: '1',
})

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
        {
          label: 'ONE',
          value: 'one',
          description: 'The first option',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
        {
          label: 'TWO',
          value: 'two',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
        {
          label: 'THREE',
          value: 'three',
          description: 'The third option',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
      ],
      ['one'],
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
        {
          label: 'ONE',
          value: 'one',
          description: 'The first option',
          background: 'red',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
        {
          label: 'TWO',
          value: 'two',
          background: 'blue',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
        {
          label: 'THREE',
          value: 'three',
          description: 'The third option',
          background: 'green',
          onSelect: ({ value, option, options, selected }) => {
            console.log(value, option, options, selected)
          },
        },
      ],
      ['one', 'three'],
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
      placeholder: 'placeholder',
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
    { username: 'admin' },
  )
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handlePostFORM = async () => {
  const res = await HttpPost(
    'http://127.0.0.1:8080/form',
    { Authorization: 'bearer', 'Content-Type': 'application/x-www-form-urlencoded' },
    { username: 'admin' },
  )
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handleUpload = async () => {
  const res = await Upload('http://127.0.0.1:8080/upload', 'data/user.yaml', {
    Authorization: 'bearer token',
  })
  console.log(res)
  alert('Result', JSON.stringify(res.headers, null, 2) + '\n' + JSON.stringify(res.body, null, 2))
}

const handleRequestWithCancel = async () => {
  message.info('loading...', 3000, () => {
    console.log('Cancel request')
    HttpCancel('cancel-download')
  })
  // const { status, body, headers } = await HttpGet(
  //   'https://php.com',
  //   {},
  //   {
  //     CancelId: 'cancel-download'
  //   }
  // )
  const { status, body, headers } = await Download(
    'https://php.com',
    'data/.cache/a.html',
    {},
    undefined,
    {
      CancelId: 'cancel-download',
    },
  )
  console.log(status, body, headers)
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

  <h2>message & picker & confirm & prompt</h2>
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
    <Button @click="handleRequestWithCancel">Cancel</Button>
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
