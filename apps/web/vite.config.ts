import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig(({ isSsrBuild }) => {
  const isDev = process.env.NODE_ENV === 'development'
  const sourceDir = isDev ? 'src' : 'dist'

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
      allowedHosts: ['web', 'localhost', '127.0.0.1'],
      proxy: {
        '/internal': {
          target: process.env.BACKGROUND_JOBS_URL,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, 'app'),
        '@shared': path.resolve(__dirname, `../../packages/shared/${sourceDir}`),
        '@ui': path.resolve(__dirname, `../../packages/ui/${sourceDir}`),
        '@db': path.resolve(__dirname, `../../packages/db/${sourceDir}`),
        '@immich': path.resolve(__dirname, `../../packages/immich/${sourceDir}`),
        '@/app': path.resolve(__dirname, './app'),
        '@vector': path.resolve(__dirname, `../../packages/vector/${sourceDir}`),
        '@search': path.resolve(__dirname, `../../packages/search/${sourceDir}`),
        '@chat': path.resolve(__dirname, `../../packages/chat/${sourceDir}`),
        '@embedding-core': path.resolve(__dirname, `../../packages/embedding-core/${sourceDir}`),
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
  }
})