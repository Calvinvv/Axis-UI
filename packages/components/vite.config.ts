import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// {{ AURA-X: Create - 配置Vite打包，支持全量和按需引入 }}
export default defineConfig({
  plugins: [
    vue(),
    // {{ AURA-X: Modify - 修复类型声明路径，仅包含组件相关类型 }}
    // {{ Source: vite-plugin-dts 官方文档 - include/exclude 配置 }}
    dts({
      tsconfigPath: '../../tsconfig.json',
      outDir: 'dist/types',
      entryRoot: './',
      // 只包含组件和入口文件
      include: ['index.ts', 'icon/**/*.ts', 'icon/**/*.vue'],
      // 排除配置文件和测试文件
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        'vite.config.ts',
      ],
      // 确保类型声明文件结构正确
      cleanVueFileName: true,
      staticImport: true,
      insertTypesEntry: true,
    }),
  ],
  build: {
    // 输出目录
    outDir: 'dist',
    // 库模式配置
    lib: {
      // 入口文件
      entry: resolve(__dirname, 'index.ts'),
      // 库名称（全局变量名）
      name: 'AxisUI',
      // 输出文件名
      fileName: format => `axis-ui.${format}.js`,
    },
    rollupOptions: {
      // 确保外部化依赖不会被打包
      external: ['vue'],
      output: {
        // 导出模式
        exports: 'named',
        // 全局变量
        globals: {
          vue: 'Vue',
        },
        // 在 UMD 模式下也输出CSS
        // {{ AURA-X: Modify - 使用 names 替代已弃用的 name 属性 }}
        assetFileNames: assetInfo => {
          // 使用 names[0] 替代已弃用的 name 属性
          const name = assetInfo.names?.[0] || 'asset'
          if (name.endsWith('.css')) {
            return 'style.css'
          }
          return name
        },
      },
    },
  },
  // CSS 预处理器配置
  // 注意: additionalData 会在所有 SCSS 文件前注入，这里注释掉避免干扰 theme-chalk 的样式导入
  // 组件内如需使用 mixins，可以在组件文件中单独导入
  // css: {
  //   preprocessorOptions: {
  //     scss: {
  //       additionalData: `@use "@axis-ui/theme-chalk/src/mixins/mixins.scss" as *;`,
  //     },
  //   },
  // },
})
