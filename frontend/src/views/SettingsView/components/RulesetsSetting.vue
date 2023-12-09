<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { BuiltInRuleSets, type RuleSet } from '@/constant/profile'
import { useBool, useMessage } from '@/hooks'
import { Readfile, Writefile } from '@/utils/bridge'
import { ignoredError } from '@/utils'

const ruleSetPath = ref('')
const list = ref<string[]>([])

const { t } = useI18n()
const { message } = useMessage()
const [showEdit, toggleEdit] = useBool(false)

const handleEdit = async ({ path }: RuleSet) => {
  const content = (await ignoredError(Readfile, path)) || '{ payload: [] }'
  const { payload } = parse(content)
  ruleSetPath.value = path
  list.value = payload
  toggleEdit()
}

const handleClear = async ({ path }: RuleSet) => {
  try {
    await Writefile(path, stringify({ payload: [] }))
    message.info('success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const handleSave = async () => {
  try {
    await Writefile(ruleSetPath.value, stringify({ payload: list.value }))
    message.info('success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}
</script>

<template>
  <div class="rulesets">
    <Card
      v-for="ruleset in BuiltInRuleSets"
      :key="ruleset.name"
      :title="ruleset.name"
      class="ruleset"
    >
      <template #extra>
        <Button @click="handleEdit(ruleset)" type="link" size="small">
          {{ t('common.edit') }}
        </Button>
        <Button @click="handleClear(ruleset)" type="link" size="small">
          {{ t('common.clear') }}
        </Button>
      </template>
      {{ ruleset.path }}
    </Card>
  </div>

  <Modal
    v-model:open="showEdit"
    :title="t('settings.rulesets')"
    @ok="handleSave"
    max-height="90"
    max-width="90"
  >
    <InputList v-model="list" style="width: 100%" />
  </Modal>
</template>

<style lang="less" scoped>
.rulesets {
  .ruleset {
    margin: 8px 0;
    font-size: 12px;
  }
}

.list {
  display: flex;
}
</style>
