import { describe, expect, it } from 'vitest'
import { MODEL_DIMENSIONS, TEXT_EMBEDDING_MODEL } from '@shared/constants/embedding'

describe('embedding constants', () => {
  it('uses the multilingual text embedding model with 768-dimensional vectors', () => {
    expect(TEXT_EMBEDDING_MODEL).toBe('Xenova/paraphrase-multilingual-mpnet-base-v2')
    expect(MODEL_DIMENSIONS.text).toBe(768)
  })
})
