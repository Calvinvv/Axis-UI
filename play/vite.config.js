import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// {{ AURA-X: Modify - 仅配置 components 入口 alias，其他包由 workspace 自然解析. Approval: 寸止 }}
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 仅映射 components 入口到源码（开发环境实时更新）
      // theme-chalk 和 utils 通过 workspace 协议自然解析
      'axis-ui': resolve(__dirname, '../packages/components/index.ts'),
    },
  },
})
