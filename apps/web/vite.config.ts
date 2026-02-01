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
      '@shared': path.resolve(__dirname, '../../packages/shared/dist'),
      '@ui': path.resolve(__dirname, '../../packages/ui/dist'),
      '@db': path.resolve(__dirname, '../../packages/db/dist'),
      '@immich': path.resolve(__dirname, '../../packages/immich/dist'),
      '@/app': path.resolve(__dirname, './app'),
      '@vector': path.resolve(__dirname, '../../packages/vector/dist'),
      '@search': path.resolve(__dirname, '../../packages/search/dist'),
      '@chat': path.resolve(__dirname, '../../packages/chat/dist'),
      '@embedding-core': path.resolve(__dirname, '../../packages/embedding-core/dist'),
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
