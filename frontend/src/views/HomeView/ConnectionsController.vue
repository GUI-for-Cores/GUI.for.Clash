<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'
import type { KernelConnectionsWS } from '@/api/kernel.schema'
import { getKernelConnectionsWS, deleteConnection, updateProvidersRules } from '@/api/kernel'
import type { Menu } from '@/stores'
import { useBool, useMessage } from '@/hooks'
import { formatBytes, formatRelativeTime } from '@/utils/format'
import { addToRuleSet } from '@/utils/generator'
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
    label: 'common.details',
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
  ...[
    ['home.connections.addToDirect', 'direct'],
    ['home.connections.addToProxy', 'proxy'],
    ['home.connections.addToReject', 'reject']
  ].map(([label, ruleset]) => {
    return {
      label,
      handler: async (record: Record<string, any>) => {
        try {
          await addToRuleSet(ruleset as any, record.metadata.host)
          await updateProvidersRules(ruleset)
          message.info('success')
        } catch (error: any) {
          message.info(error)
          console.log(error)
        }
      }
    }
  })
]

const details = ref()
const dataSource = ref<KernelConnectionsWS['connections']>([])
const [showDetails, toggleDetails] = useBool(false)
const { message } = useMessage()

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
