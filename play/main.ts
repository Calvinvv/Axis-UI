import { createApp } from 'vue'
import App from './app.vue'

import { Icon, Tree } from 'axis-ui'

const app = createApp(App)

app.use(Icon)
app.use(Tree)

app.mount('#app')
