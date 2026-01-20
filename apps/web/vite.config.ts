import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths({ ignoreConfigErrors: true })],
  server: {
    allowedHosts: ['web', 'localhost', '127.0.0.1'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui'),
      '@db': path.resolve(__dirname, '../../packages/db/src'),
      '@vector': path.resolve(__dirname, '../../packages/vector/src'),
      '@ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@search': path.resolve(__dirname, '../../packages/search/src'),
      '@immich': path.resolve(__dirname, '../../packages/immich/src'),
      '@media-utils': path.resolve(__dirname, '../../packages/media-utils/src'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
  optimizeDeps: {
    exclude: ['pino-pretty', 'chromadb'],
  },
  ssr: {
    external: ['pino-pretty'],
  },
  build: {
    rollupOptions: isSsrBuild ? { input: './server/app.ts' } : undefined,
  },
}))
