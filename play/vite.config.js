import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import vueJsx from '@vitejs/plugin-vue-jsx'
import DefineOptions from 'unplugin-vue-define-options/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

// {{ AURA-X: Modify - 仅配置 components 入口 alias，其他包由 workspace 自然解析. Approval: 寸止 }}
export default defineConfig({
  plugins: [
    vue(),
    DefineOptions(),
    vueJsx(),
    Icons({
      autoInstall: true, // 自动安装需要的图标库 (建议开启)
      compiler: 'vue3', // 指定编译器，默认为 'vue3'
    }),
    Components({
      dts: false,
      resolvers: [
        // 自动注册图标组件
        IconsResolver({
          prefix: 'i', // 自动引入的图标组件前缀，默认为 'i'
        }),
      ],
    }),
  ],
  resolve: {
    alias: {
      // 仅映射 components 入口到源码（开发环境实时更新）
      // theme-chalk 和 utils 通过 workspace 协议自然解析
      'axis-ui': resolve(__dirname, '../packages/components/index.ts'),
    },
  },
})
