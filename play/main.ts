import { createApp } from 'vue'
import App from './app.vue'

import Icon from 'axis-ui'
import Tree from 'axis-ui'

// {{ AURA-X: Delete - 移除手动样式引入，样式已在组件入口自动导入. Approval: 寸止 }}
const app = createApp(App)

app.use(Icon)
app.use(Tree)

app.mount('#app')
