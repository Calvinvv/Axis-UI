import type { App } from 'vue'

// {{ AURA-X: Create - 创建组件库统一入口，支持全量引入和按需引入 }}
// 导入样式
import '@axis-ui/theme-chalk/src/index.scss'
import Icon from './icon'
import Tree from './tree'

// 所有组件列表
const components = [Icon, Tree]

// 全量安装方法
const install = (app: App) => {
  components.forEach(component => {
    app.use(component)
  })
}

// 默认导出支持 app.use(AxisUI)
export default {
  install,
}

// 按需导出各个组件
export { Icon, Tree }

// 导出组件类型
export * from './icon'
