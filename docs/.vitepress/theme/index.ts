import DefaultTheme from 'vitepress/theme'
import './style.css'
import Demo from './components/Demo.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Demo', Demo)
  },
}
