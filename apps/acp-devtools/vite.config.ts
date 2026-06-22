import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      'axis-ui': resolve(__dirname, '../../packages/components/index.ts'),
      '@axis-ui/utils': resolve(__dirname, '../../packages/utils/index.ts'),
      '@axis-ui/theme-chalk/src': resolve(
        __dirname,
        '../../packages/theme-chalk/src'
      ),
      '@axis-ui/theme-chalk': resolve(__dirname, '../../packages/theme-chalk'),
      '@axis-ui/acp-core': resolve(
        __dirname,
        '../../packages/acp-core/src/index.ts'
      ),
    },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
