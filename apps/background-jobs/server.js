import { createJiti } from 'jiti'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const jiti = createJiti(import.meta.url, {
  alias: {
    '@media-utils': path.resolve(__dirname, '../../packages/media-utils/dist'),
    '@shared': path.resolve(__dirname, '../../packages/shared/dist'),
    '@immich': path.resolve(__dirname, '../../packages/immich/dist'),
    '@search': path.resolve(__dirname, '../../packages/search/dist'),
    '@smart-collections': path.resolve(__dirname, '../../packages/smart-collections/dist'),
    '@vector': path.resolve(__dirname, '../../packages/vector/dist'),
    '@db': path.resolve(__dirname, '../../packages/db/dist'),
    '@embedding-core': path.resolve(__dirname, '../../packages/embedding-core/dist'),
    '@embedding-media': path.resolve(__dirname, '../../packages/embedding-media/dist'),
    '@background-jobs': path.resolve(__dirname, './dist'),
    '@ai': path.resolve(__dirname, '../../packages/ai/dist'),
    '@chat': path.resolve(__dirname, '../../packages/chat/dist'),
  },
  interopDefault: true,
  fsCache: false,
})

await jiti.import('./dist/index.js')
