import { describe, expect, it, vi } from 'vitest'
import type { Scene } from '@shared/types/scene'

vi.mock('@shared/services/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe('sceneToVectorFormat localization', () => {
  it('uses Russian connective text while preserving canonical metadata values', async () => {
    const { sceneToVectorFormat } = await import('../src/utils/shared')
    const scene: Scene = {
      id: 'scene-1',
      source: '/videos/folder/source.mp4',
      thumbnailUrl: '/thumb.jpg',
      startTime: 1,
      endTime: 3,
      duration: 120,
      faces: ['Alex'],
      objects: ['dog'],
      detectedText: ['SALE'],
      transcription: 'hello world',
      description: 'A dog runs in a park.',
      shotType: 'close-up',
      emotions: [{ name: 'Alex', emotion: 'happy', confidence: 93 }],
      dominantColorHex: '#ffffff',
      dominantColorName: 'white',
      camera: 'Canon 5D',
      createdAt: 1_700_000_000_000,
      location: 'Moscow, Russia',
      aspectRatio: '16:9',
    }

    const doc = await sceneToVectorFormat(scene, 'ru')

    expect(doc.text).toContain('Это сцена')
    expect(doc.text).toContain('Canon 5D')
    expect(doc.text).toContain('SALE')
    expect(doc.metadata.shotType).toBe('close-up')
    expect(doc.metadata.camera).toBe('Canon 5D')
    expect(doc.metadata.detectedText).toBe('SALE')
  })
})
