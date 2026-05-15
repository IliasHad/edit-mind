import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@chat': path.resolve(__dirname, './src'),
      '@ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
