import { describe, expect, it } from 'vitest'
import type { DetectedObject, Face, FrameAnalysis } from '@shared/types/analysis'
import { buildSceneDescription } from '../src/utils/scenes'

const createObject = (label: string): DetectedObject =>
  ({
    label,
    confidence: 0.9,
    box: [0, 0, 10, 10],
    bbox: { x: 0, y: 0, width: 10, height: 10 },
  }) satisfies DetectedObject

const createFace = (name = 'Unknown', emotion = 'neutral'): Face =>
  ({
    name,
    location: [0, 0, 10, 10],
    emotion: { label: emotion, confidence: 0.8 },
    bbox: { x: 0, y: 0, width: 10, height: 10 },
    confidence: 0.9,
    custom_metadata: {},
  }) satisfies Face

const createFrame = (overrides: Partial<FrameAnalysis>): FrameAnalysis =>
  ({
    timestamp_seconds: 0,
    objects: [],
    faces: [],
    start_time_ms: 0,
    end_time_ms: 1000,
    scene_description: '',
    shot_type: '',
    description: '',
    thumbnail_path: '',
    ...overrides,
  }) as FrameAnalysis

describe('buildSceneDescription', () => {
  it('builds a Russian metadata-based description without raw English BLIP text', () => {
    const frame = createFrame({
      description: 'a large trailer with a door open',
      objects: [createObject('trailer')],
      faces: [createFace()],
      detected_text: [{
        text: 'SALE',
        confidence: 0.9,
        bounding_box: [[0, 0], [10, 0], [10, 10], [0, 10]],
        bbox: { x: 0, y: 0, width: 10, height: 10 },
      }],
    })

    const description = buildSceneDescription(frame, 'ru')

    expect(description).toContain('Сцена с объектами: трейлер.')
    expect(description).not.toContain('trailer')
    expect(description).toContain('В кадре 1 человек.')
    expect(description).toContain('Текст на экране: "SALE".')
    expect(description).not.toContain('a large trailer with a door open')
  })

  it('localizes common object labels in Russian descriptions', () => {
    const frame = createFrame({
      objects: [createObject('trailer'), createObject('door'), createObject('person'), createObject('dog')],
    })

    const description = buildSceneDescription(frame, 'ru')

    expect(description).toContain('Сцена с объектами: трейлер, дверь, человек, собака.')
    expect(description).not.toMatch(/\b(trailer|door|person|dog)\b/)
  })

  it('includes localized shot type metadata in Russian descriptions', () => {
    const frame = createFrame({
      objects: [createObject('dog')],
      shot_type: 'long-shot',
    })

    const description = buildSceneDescription(frame, 'ru')

    expect(description).toContain('общий план')
    expect(description).not.toContain('long-shot')
  })

  it('includes localized face emotions in Russian descriptions', () => {
    const frame = createFrame({
      faces: [createFace('Ivan', 'happy')],
    })

    const description = buildSceneDescription(frame, 'ru')

    expect(description).toContain('счастлив')
    expect(description).not.toContain('happy')
  })

  it('returns the original frame description for English', () => {
    const frame = createFrame({
      description: 'a large trailer with a door open',
      objects: [createObject('trailer')],
    })

    expect(buildSceneDescription(frame, 'en')).toBe('a large trailer with a door open')
  })

  it('uses a Russian fallback when no objects, faces, or detected text exist', () => {
    const frame = createFrame({
      description: 'a large trailer with a door open',
      objects: [],
      faces: [],
      detected_text: [],
    })

    expect(buildSceneDescription(frame, 'ru')).toBe('Сцена без распознанных объектов или людей.')
  })

  it('uses Russian face count wording for five people', () => {
    const frame = createFrame({
      description: 'five people standing outside',
      faces: Array.from({ length: 5 }, (_, index) => createFace(`Person ${index}`)),
    })

    expect(buildSceneDescription(frame, 'ru')).toBe('В кадре 5 человек.')
  })
})
