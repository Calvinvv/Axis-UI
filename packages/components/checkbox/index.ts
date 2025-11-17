import { withInstall } from '@axis-ui/utils'
import _Checkbox from './src/checkbox.vue'

const Checkbox = withInstall(_Checkbox)

export default Checkbox

export * from './src/checkbox'

declare module 'vue' {
  export interface GlobalComponents {
    AxCheckbox: typeof Checkbox
  }
}
