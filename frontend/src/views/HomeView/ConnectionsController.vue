<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'
import { parse, stringify } from 'yaml'
import type { KernelConnectionsWS } from '@/api/kernel.schema'
import { getKernelConnectionsWS, deleteConnection } from '@/api/kernel'
import type { Menu } from '@/stores'
import { ignoredError } from '@/utils'
import { useBool, useMessage } from '@/hooks'
import { Readfile, Writefile } from '@/utils/bridge'
import { formatBytes, formatRelativeTime } from '@/utils/format'
import type { Column } from '@/components/Table/index.vue'

const columns: Column[] = [
  {
    title: 'home.connections.host',
    key: 'metadata.host',
    align: 'left',
    customRender: ({ value, record }) => {
      return (value || record.metadata.destinationIP) + ':' + record.metadata.destinationPort
    }
  },
  {
    title: 'home.connections.chains',
    key: 'chains',
    align: 'left',
    customRender: ({ value }) => value[0]
  },
  {
    title: 'home.connections.upload',
    key: 'upload',
    customRender: ({ value }) => formatBytes(value)
  },
  {
    title: 'home.connections.download',
    key: 'download',
    customRender: ({ value }) => formatBytes(value)
  },
  {
    title: 'home.connections.time',
    key: 'start',
    customRender: ({ value }) => formatRelativeTime(value)
  }
]

const menu: Menu[] = [
  {
    label: 'home.connections.details',
    handler: (record: Record<string, any>) => {
      details.value = JSON.stringify(record, null, 4)
      toggleDetails()
    }
  },
  {
    label: 'home.connections.close',
    handler: async (record: Record<string, any>) => {
      try {
        await deleteConnection(record.id)
      } catch (error: any) {
        console.log(error)
        message.info(error)
      }
    }
  },
  {
    label: 'home.connections.addToDirect',
    handler: async (record: Record<string, any>) => {
      try {
        await addToRuleSet('direct', record.metadata.host)
        message.info('success')
      } catch (error: any) {
        message.info(error)
      }
    }
  },
  {
    label: 'home.connections.addToProxy',
    handler: async (record: Record<string, any>) => {
      try {
        await addToRuleSet('proxy', record.metadata.host)
        message.info('success')
      } catch (error: any) {
        message.info(error)
      }
    }
  },
  {
    label: 'home.connections.addToReject',
    handler: async (record: Record<string, any>) => {
      try {
        await addToRuleSet('reject', record.metadata.host)
        message.info('success')
      } catch (error: any) {
        message.info(error)
      }
    }
  }
]

const details = ref()
const dataSource = ref<KernelConnectionsWS['connections']>([])
const [showDetails, toggleDetails] = useBool(false)
const { message } = useMessage()

const addToRuleSet = async (ruleset: 'direct' | 'reject' | 'proxy', domain: string) => {
  if (!domain) throw 'domain is empty'
  const path = `data/rulesets/${ruleset}.yaml`
  const content = (await ignoredError(Readfile, path)) || '{ payload: [] }'
  const { payload } = parse(content)
  payload.unshift('DOMAIN,' + domain)
  await Writefile(path, stringify({ payload: [...new Set(payload)] }))
}

const onConnections = (data: KernelConnectionsWS) => {
  dataSource.value = data.connections.sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
  )
}

const disconnect = getKernelConnectionsWS(onConnections)

onUnmounted(disconnect)
</script>

<template>
  <div class="connections">
    <Table :columns="columns" :menu="menu" :data-source="dataSource" />
  </div>

  <Modal v-model:open="showDetails" max-height="90" max-width="90" :submit="false" mask-closable>
    <pre>{{ details }}</pre>
  </Modal>
</template>

<style lang="less" scoped></style>
