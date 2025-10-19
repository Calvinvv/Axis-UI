import { createApp } from 'vue'
import App from './app.vue'
import axisIcon from '../packages/components/icon'

const app = createApp(App)

app.use(axisIcon)

app.mount('#app')
