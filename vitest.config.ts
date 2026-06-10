import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const aliases = {
  '@': resolve(__dirname),
  '@test': resolve(__dirname, './test'),
  '@packages': resolve(__dirname, './packages'),
  '@docs': resolve(__dirname, './docs'),
  'axis-ui': resolve(__dirname, './packages/components/index.ts'),
  '@axis-ui/utils': resolve(__dirname, './packages/utils/index.ts'),
  '@axis-ui/theme-chalk/src': resolve(__dirname, './packages/theme-chalk/src'),
  '@axis-ui/theme-chalk': resolve(__dirname, './packages/theme-chalk'),
  '@axis-ui/acp-core': resolve(__dirname, './packages/acp-core/src/index.ts'),
}

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [vue(), vueJsx()],
        resolve: { alias: aliases },
        test: {
          name: 'axis-ui',
          environment: 'happy-dom',
          include: ['test/components/**/*.spec.ts', 'test/utils/**/*.spec.ts'],
          setupFiles: ['./test/setup/index.ts'],
        },
      },
      {
        test: {
          name: 'acp-node',
          environment: 'node',
          include: [
            'test/repository/**/*.spec.ts',
            'packages/{acp-core,acp-harness,acp-cli}/**/*.spec.ts',
            'fixtures/acp-agents/**/*.spec.ts',
          ],
        },
      },
      {
        plugins: [vue()],
        test: {
          name: 'acp-devtools',
          environment: 'happy-dom',
          include: ['apps/acp-devtools/test/unit/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'contract',
          environment: 'node',
          include: ['test/contract/**/*.contract.spec.ts'],
        },
      },
      {
        test: {
          name: 'scenario',
          environment: 'node',
          include: ['test/scenario/**/*.scenario.spec.ts'],
        },
      },
      {
        test: {
          name: 'replay',
          environment: 'node',
          include: ['test/replay/**/*.replay.spec.ts'],
        },
      },
      {
        test: {
          name: 'security',
          environment: 'node',
          include: ['test/security/**/*.security.spec.ts'],
        },
      },
      {
        plugins: [vue()],
        test: {
          name: 'browser',
          include: ['apps/acp-devtools/test/browser/**/*.browser.spec.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
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
        '**/*.scss',
        '**/*.css',
      ],
      thresholds: {
        statements: 78,
        branches: 48,
        functions: 72,
        lines: 78,
      },
    },
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: false,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
