<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { parse, stringify } from 'yaml'
import { useAppSettingsStore } from '@/stores'
import { BuiltInRuleSets, type RuleSet } from '@/constant/profile'
import { useBool, useMessage } from '@/hooks'
import { Readfile, Writefile } from '@/utils/bridge'
import { ignoredError } from '@/utils'
import { updateProvidersRules } from '@/api/kernel'

const ruleSet = ref({ name: '', path: '' })
const list = ref<string[]>([])

const { t } = useI18n()
const { message } = useMessage()
const appSettings = useAppSettingsStore()
const [showEdit, toggleEdit] = useBool(false)

const handleEdit = async ({ name, path }: RuleSet) => {
  const content = (await ignoredError(Readfile, path)) || '{ payload: [] }'
  const { payload } = parse(content)
  ruleSet.value = { name, path }
  list.value = payload
  toggleEdit()
}

const handleClear = async ({ name, path }: RuleSet) => {
  try {
    await Writefile(path, stringify({ payload: [] }))
    await _updateProvidersRules(name)
    message.info('success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const handleSave = async () => {
  try {
    await Writefile(ruleSet.value.path, stringify({ payload: list.value }))
    await _updateProvidersRules(ruleSet.value.name)
    message.info('success')
  } catch (error: any) {
    message.info(error)
    console.log(error)
  }
}

const _updateProvidersRules = async (ruleset: string) => {
  if (appSettings.app.kernel.running) {
    await updateProvidersRules(ruleset)
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
