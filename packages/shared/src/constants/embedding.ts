export const EMBEDDING_BATCH_SIZE = 10
export const VISUAL_BATCH_SIZE = 10
export const AUDIO_BATCH_SIZE = 10

export const EMBEDDING_TIMEOUT = 60000
export const MODEL_DIMENSIONS = {
  text: 768, // all-mpnet-base-v2
  visual: 512, // clip-vit-base-patch32
  audio: 512, // clap-htsat-unfused
}
