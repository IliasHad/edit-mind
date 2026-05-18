import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { handleList, handleGet } from '../../src/tools/videos.js'
import type { Fetcher } from '../../src/types.js'

const makeVideo = (overrides = {}) => ({
  id: 'video-1',
  name: 'GX017252.MP4',
  source: '/media/GX017252.MP4',
  thumbnailUrl: '/media/.thumbnails/GX017252.jpg',
  duration: 24,
  location: 'Paris',
  aspectRatio: '16:9',
  importAt: '2026-01-13T10:00:00Z',
  ...overrides,
})

const makeScene = (overrides = {}) => ({
  id: 'scene-1',
  source: '/media/video.mp4',
  startTime: 0,
  endTime: 5.2,
  duration: 5.2,
  description: 'Wide shot of Paris street',
  transcription: 'We are in Paris',
  shotType: 'wide',
  camera: 'GoPro HERO11',
  location: 'Paris',
  faces: ['Ilias'],
  objects: ['street'],
  emotions: [{ name: 'Ilias', emotion: 'happy', confidence: 0.9 }],
  detectedText: ['PARIS'],
  thumbnailUrl: '/media/.thumbnails/scene-1.jpg',
  dominantColorName: 'blue',
  matched: false,
  ...overrides,
})

function makeFetch(body: unknown, status = 200): Fetcher {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('list_videos', () => {
  test('returns numbered list of videos', async () => {
    const videos = [makeVideo(), makeVideo({ id: 'video-2', name: 'clip.mp4' })]
    const fetch = makeFetch({ videos, total: 2 })
    const result = await handleList({}, fetch)

    const text = result.content[0].text as string
    assert.ok(text.includes('2 videos'))
    assert.ok(text.includes('GX017252.MP4'))
    assert.ok(text.includes('clip.mp4'))
    assert.ok(text.includes('16:9'))
  })

  test('shows "X of Y" when API returns a partial page', async () => {
    const fetch = makeFetch({ videos: [makeVideo()], total: 50 })
    const result = await handleList({}, fetch)
    assert.ok((result.content[0].text as string).includes('1 of 50 videos'))
  })

  test('includes thumbnail URL in output', async () => {
    const fetch = makeFetch({ videos: [makeVideo()], total: 1 })
    const result = await handleList({}, fetch)
    assert.ok((result.content[0].text as string).includes('/media/.thumbnails/GX017252.jpg'))
  })

  test('omits thumbnail line when thumbnailUrl is null', async () => {
    const fetch = makeFetch({ videos: [makeVideo({ thumbnailUrl: null })], total: 1 })
    const result = await handleList({}, fetch)
    assert.ok(!(result.content[0].text as string).includes('Thumbnail:'))
  })

  test('returns empty message when no videos', async () => {
    const fetch = makeFetch({ videos: [], total: 0 })
    const result = await handleList({}, fetch)
    assert.ok((result.content[0].text as string).includes('No videos'))
  })

  test('throws McpError on API failure', async () => {
    const fetch: Fetcher = async () => new Response('Error', { status: 500 })
    await assert.rejects(
      () => handleList({}, fetch),
      (err: Error) => err.message.includes('Failed to list videos')
    )
  })
})

describe('get_video', () => {
  test('returns video header with all fields', async () => {
    const fetch = makeFetch({ video: makeVideo(), scenes: [makeScene()] })
    const result = await handleGet({ id: 'video-1' }, fetch)

    const text = result.content[0].text as string
    assert.ok(text.includes('GX017252.MP4'))
    assert.ok(text.includes('/media/.thumbnails/GX017252.jpg'), 'should include video thumbnail')
    assert.ok(text.includes('Paris'), 'should include location')
  })

  test('formats scenes with correct field rendering', async () => {
    const fetch = makeFetch({ video: makeVideo(), scenes: [makeScene()] })
    const result = await handleGet({ id: 'video-1' }, fetch)

    const text = result.content[0].text as string
    assert.ok(text.includes('Wide shot of Paris street'), 'should include scene description')
    assert.ok(text.includes('Faces: Ilias'), 'should include detected faces')
    assert.ok(text.includes('Ilias: happy'), 'should format emotions as name: emotion')
    assert.ok(text.includes('GoPro HERO11'), 'should include camera model')
    assert.ok(text.includes('/media/.thumbnails/scene-1.jpg'), 'should include scene thumbnail')
    assert.ok(text.includes('Text: PARIS'), 'should include detected text')
  })

  test('shows scene count in header', async () => {
    const fetch = makeFetch({
      video: makeVideo(),
      scenes: [makeScene(), makeScene({ id: 'scene-2' })],
    })
    const result = await handleGet({ id: 'video-1' }, fetch)
    assert.ok((result.content[0].text as string).includes('2 scenes'))
  })

  test('shows no scenes message when scenes array is empty', async () => {
    const fetch = makeFetch({ video: makeVideo(), scenes: [] })
    const result = await handleGet({ id: 'video-1' }, fetch)
    assert.ok((result.content[0].text as string).includes('No scenes indexed yet'))
  })

  test('returns error content on 404', async () => {
    const fetch: Fetcher = async () => new Response('', { status: 404 })
    const result = await handleGet({ id: 'missing' }, fetch)
    assert.ok(result.isError)
    assert.ok((result.content[0].text as string).includes('not found'))
  })

  test('throws McpError when id is missing', async () => {
    const fetch: Fetcher = async () => new Response('', { status: 200 })
    await assert.rejects(
      () => handleGet({}, fetch),
      (err: Error) => err.message.includes('id is required')
    )
  })
})
