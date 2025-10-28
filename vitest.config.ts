import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [vue(), dts()],
  test: {
    // 启用类似Jest的测试API
    globals: true,
    // 模拟DOM环境
    environment: 'happy-dom',
    // 支持Vue文件
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.output'],
    // 测试设置文件
    setupFiles: ['./test/setup/index.ts'],
    // 测试覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'packages/**/dist/**',
        'play/**',
        'docs/**',
        '**/*.d.ts',
        '**/*.config.*',
        'test/**',
        'coverage/**',
      ],
      // 覆盖率阈值
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // 快照测试配置
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: false,
    },
    // 测试超时时间
    testTimeout: 10000,
    // 钩子超时时间
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '@test': resolve(__dirname, './test'),
      '@packages': resolve(__dirname, './packages'),
      '@docs': resolve(__dirname, './docs'),
    },
  },
})
