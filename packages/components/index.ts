import type { App } from 'vue'
import AxIcon from './icon'

// {{ AURA-X: Create - 创建组件库统一入口，支持全量引入和按需引入 }}
// 导入样式
import '@axis-ui/theme-chalk/src/index.scss'

// 所有组件列表
const components = [AxIcon]

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
export { AxIcon }

// 导出组件类型
export * from './icon'
