import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const aliases = {
  '@/app': resolve(__dirname, 'app'),
  '@/lib': resolve(__dirname, 'lib'),
  '@/resources': resolve(__dirname, 'resources'),
  '@shared': resolve(__dirname, '../../packages/shared/dist'),
  '@ui': resolve(__dirname, '../../packages/ui/src'),
}
export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@shared', 'sharp'],
      }),
    ],
    resolve: {
      alias: aliases,
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'lib/main/main.ts'),
        },
        external: ['chromadb', '@shared', 'onnxruntime-node', '@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe', 'sharp', 'egm96-universal', 'node-llama-cpp'],
      },
      outDir: 'dist',
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'lib/preload/preload.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: './app',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'app/index.html'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [tailwindcss(), react()],
  },
})
