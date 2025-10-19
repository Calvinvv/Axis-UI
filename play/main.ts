import { createApp } from 'vue'
import App from './app.vue'
import AxIcon from '../packages/components/icon'
import '@axis-ui/theme-chalk/src/index.scss'
const app = createApp(App)

app.use(AxIcon)

app.mount('#app')
