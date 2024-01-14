import { stringify, parse } from 'yaml'

import * as Utils from '@/utils'
import * as Bridge from '@/utils/bridge'

// global method
window.Plugins = {
  ...Bridge,
  ...Utils,
  YAML: {
    parse,
    stringify
  }
}
