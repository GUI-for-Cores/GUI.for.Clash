<script setup lang="ts">
import LinkIcon from './LinkIcon.vue'
import EditIcon from './EditIcon.vue'
import LoadingIcon from './LoadingIcon.vue'
import SelectedIcon from './SelectedIcon.vue'
import DisabledIcon from './DisabledIcon.vue'
import PinIcon from './PinIcon.vue'
import PinFillIcon from './PinFillIcon.vue'
import MinimizeIcon from './MinimizeIcon.vue'
import MaximizeIcon from './MaximizeIcon.vue'
import Maximize2Icon from './Maximize2Icon.vue'
import CloseIcon from './CloseIcon.vue'
import ArrowDownIcon from './ArrowDownIcon.vue'
import SpeedTestIcon from './SpeedTestIcon.vue'
import EmptyIcon from './EmptyIcon.vue'
import GithubIcon from './GithubIcon.vue'
import ForbiddenIcon from './ForbiddenIcon.vue'
import TelegramIcon from './TelegramIcon.vue'
import ExpandIcon from './ExpandIcon.vue'
import CollapseIcon from './CollapseIcon.vue'
import RefreshIcon from './RefreshIcon.vue'

const icons = {
  link: LinkIcon,
  edit: EditIcon,
  loading: LoadingIcon,
  selected: SelectedIcon,
  disabled: DisabledIcon,
  pin: PinIcon,
  pinned: PinFillIcon,
  minimize: MinimizeIcon,
  maximize: MaximizeIcon,
  maximize2: Maximize2Icon,
  close: CloseIcon,
  arrowDown: ArrowDownIcon,
  speedTest: SpeedTestIcon,
  empty: EmptyIcon,
  github: GithubIcon,
  forbidden: ForbiddenIcon,
  telegram: TelegramIcon,
  expand: ExpandIcon,
  collapse: CollapseIcon,
  refresh: RefreshIcon
}

interface Props {
  icon: keyof typeof icons
}

withDefaults(defineProps<Props>(), {})
</script>

<template>
  <component :is="icons[icon]" v-bind="$attrs" fill="var(--color)"></component>
</template>

<style lang="less" scoped></style>
