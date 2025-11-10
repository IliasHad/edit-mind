import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    logHeapUsage: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.spec.ts', '**/*.test.ts'],
    },
    testTimeout: 300000, // 5 minutes
    hookTimeout: 30000 * 2,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@/app': path.resolve(__dirname, './app'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/resources': path.resolve(__dirname, './resources'),
    },
  },
})
