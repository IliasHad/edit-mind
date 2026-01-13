import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src'),
    },
  },
})
