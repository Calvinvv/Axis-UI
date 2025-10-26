import { createApp } from 'vue'
import App from './app.vue'
import AxIcon from 'axis-ui'

// {{ AURA-X: Delete - 移除手动样式引入，样式已在组件入口自动导入. Approval: 寸止 }}
const app = createApp(App)

app.use(AxIcon)

app.mount('#app')
