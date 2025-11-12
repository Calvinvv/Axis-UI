import { withInstall } from '@axis-ui/utils'
import _Virtual from './src/virtual'

const Tree = withInstall(_Virtual)

export default Tree

declare module 'vue' {
  export interface GlobalComponents {
    AxVirtualList: typeof _Virtual
  }
}
