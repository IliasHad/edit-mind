import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../../src/tools/search.js'
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
  faces: ['Ilias'],
  objects: ['eiffel tower', 'street'],
  emotions: [{ name: 'Ilias', emotion: 'happy', confidence: 0.9 }],
  ...overrides,
})

function makeFetch(body: unknown, status = 200): Fetcher {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('search_video_scenes', () => {
  test('returns formatted video list for matching results', async () => {
    const fetch = makeFetch({ videos: [makeVideo()], total: 1, limit: 20 })
    const result = await handle({ query: 'paris' }, fetch)

    assert.equal(result.content.length, 1)
    assert.equal(result.content[0].type, 'text')
    const text = result.content[0].text as string

    assert.ok(text.includes('GX017252.MP4'), 'should include video name')
    assert.ok(text.includes('Faces: Ilias'), 'should include detected faces')
    assert.ok(text.includes('Ilias: happy'), 'should format emotions as name: emotion')
    assert.ok(text.includes('eiffel tower'), 'should include detected objects')
    assert.ok(text.includes('/media/.thumbnails/GX017252.jpg'), 'should include thumbnail URL')
    assert.ok(text.includes('/media/GX017252.MP4'), 'should include source path')
    assert.ok(!text.includes('★'), 'should not have scene-matched star indicator')
  })

  test('shows total count in header', async () => {
    const fetch = makeFetch({ videos: [makeVideo(), makeVideo({ id: 'v2' })], total: 42, limit: 20 })
    const result = await handle({}, fetch)
    assert.ok((result.content[0].text as string).includes('Found 42 video'))
  })

  test('returns empty message when no videos found', async () => {
    const fetch = makeFetch({ videos: [], total: 0, limit: 20 })
    const result = await handle({ query: 'nonexistent' }, fetch)
    assert.ok((result.content[0].text as string).includes('No videos found'))
  })

  test('sends location as a string field, not an array', async () => {
    let captured: Record<string, unknown> = {}
    const fetch: Fetcher = async (_path, options) => {
      captured = JSON.parse(options?.body as string)
      return new Response(JSON.stringify({ videos: [], total: 0, limit: 20 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    await handle({ location: 'Paris' }, fetch)
    assert.equal(captured.location, 'Paris', 'location must be a string')
    assert.equal(captured.locations, undefined, 'must not send a locations array')
  })

  test('sends aspectRatio from aspect_ratio arg', async () => {
    let captured: Record<string, unknown> = {}
    const fetch: Fetcher = async (_path, options) => {
      captured = JSON.parse(options?.body as string)
      return new Response(JSON.stringify({ videos: [], total: 0, limit: 20 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    await handle({ aspect_ratio: '16:9' }, fetch)
    assert.equal(captured.aspectRatio, '16:9')
  })

  test('omits faces/objects/emotions sections when arrays are empty', async () => {
    const video = makeVideo({ faces: [], objects: [], emotions: [] })
    const fetch = makeFetch({ videos: [video], total: 1, limit: 20 })
    const result = await handle({}, fetch)
    const text = result.content[0].text as string

    assert.ok(!text.includes('Faces:'), 'should not render empty faces')
    assert.ok(!text.includes('Objects:'), 'should not render empty objects')
    assert.ok(!text.includes('Emotions:'), 'should not render empty emotions')
  })

  test('throws McpError on API failure', async () => {
    const fetch: Fetcher = async () => new Response('Internal server error', { status: 500 })
    await assert.rejects(
      () => handle({ query: 'test' }, fetch),
      (err: Error) => err.message.includes('Search failed (500)')
    )
  })
})
