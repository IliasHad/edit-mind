export const EMBEDDING_BATCH_SIZE = 10
export const VISUAL_BATCH_SIZE = 10
export const AUDIO_BATCH_SIZE = 10

export const MODEL_CACHE_DIR = process.env.XENOVA_MODEL_CACHE_DIR || '/ml-models/embedding';
export const AUDIO_EMBEDDING_MODEL = 'Xenova/clap-htsat-unfused';
export const VISUAL_EMBEDDING_MODEL = 'Xenova/clip-vit-base-patch32';
export const TEXT_EMBEDDING_MODEL = 'Xenova/all-mpnet-base-v2';

export const EMBEDDING_TIMEOUT = 60000
export const MODEL_DIMENSIONS = {
  text: 768, // all-mpnet-base-v2
  visual: 512, // clip-vit-base-patch32
  audio: 512, // clap-htsat-unfused
}
