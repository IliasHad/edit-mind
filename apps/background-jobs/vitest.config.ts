import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['tests/**', 'src/index.ts', 'src/watcher.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@background-jobs': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@vector': path.resolve(__dirname, '../../packages/vector/src'),
      '@db': path.resolve(__dirname, '../../packages/db/src'),
      '@media-utils': path.resolve(__dirname, '../../packages/media-utils/src'),
      '@search': path.resolve(__dirname, '../../packages/search/src'),
      '@immich': path.resolve(__dirname, '../../packages/immich/src'),
      '@smart-collections': path.resolve(__dirname, '../../packages/smart-collections/src'),
      '@embedding-core': path.resolve(__dirname, '../../packages/embedding-core/src'),
    },
  },
})
