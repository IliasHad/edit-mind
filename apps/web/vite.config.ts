import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths({ ignoreConfigErrors: true })],
  server: {
    allowedHosts: ['web', 'localhost', '127.0.0.1'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '@background-jobs': path.resolve(__dirname, '../../apps/background-jobs'),
      '@shared': path.resolve(__dirname, '../../packages/shared'),
      '@ui': path.resolve(__dirname, '../../packages/ui'),
      '@/app': path.resolve(__dirname, './app'),
    },
  },
  optimizeDeps: {
    exclude: [
      'node-llama-cpp',
      '@node-llama-cpp/linux-arm64',
      '@node-llama-cpp/linux-x64',
      '@node-llama-cpp/linux-x64-cuda',
      '@node-llama-cpp/linux-x64-cuda-ext',
      '@node-llama-cpp/linux-x64-vulkan',
      '@node-llama-cpp/mac-x64',
      '@node-llama-cpp/mac-arm64-metal',
      '@node-llama-cpp/win-x64',
      '@node-llama-cpp/win-arm64',
      '@node-llama-cpp/win-x64-cuda',
      '@node-llama-cpp/win-x64-cuda-ext',
      '@node-llama-cpp/win-x64-vulkan',
      '@node-llama-cpp/linux-armv7l',
    ],
  },
  ssr: {
    noExternal: ['node-llama-cpp', '@node-llama-cpp/*'],
    external: [
      'node-llama-cpp',
      '@node-llama-cpp/linux-arm64',
      '@node-llama-cpp/linux-x64',
      '@node-llama-cpp/linux-x64-cuda',
      '@node-llama-cpp/linux-x64-cuda-ext',
      '@node-llama-cpp/linux-x64-vulkan',
      '@node-llama-cpp/win-x64',
      '@node-llama-cpp/win-x64-cuda',
      '@node-llama-cpp/win-x64-vulkan',
      '@node-llama-cpp/mac-x64',
      '@node-llama-cpp/mac-arm64-metal',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        'chromadb',
        'onnxruntime-node',
        '@ffmpeg-installer/ffmpeg',
        '@ffprobe-installer/ffprobe',
        'sharp',
        'egm96-universal',
        '@xenova/transformers',
        'pino',
      ],
    },
  },
})
