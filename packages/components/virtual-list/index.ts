import { withInstall } from '@axis-ui/utils'
import _Virtual from './src/virtual'

const Virtual = withInstall(_Virtual)

export default Virtual

export * from './src/virtual'

declare module 'vue' {
  export interface GlobalComponents {
    AxVirtualList: typeof Virtual
  }
}
