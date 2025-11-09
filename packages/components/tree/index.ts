import { withInstall } from '@axis-ui/utils'
import _Tree from './src/tree.vue'

const Tree = withInstall(_Tree)

export default Tree

//引用模板后有组件注释了,代码里面的“AxTree”改成什么名字，实际项目中引入的什么标签就会被当成什么类型
declare module 'vue' {
  export interface GlobalComponents {
    AxTree: typeof _Tree
  }
}

export * from './src/tree' //使用这个组件的开发者可以从包的入口直接导入所有需要的类型
