import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { handleList, handleGet } from '../../src/tools/collections.js'
import type { Fetcher } from '../../src/types.js'

const makeCollection = (overrides = {}) => ({
  id: 'col-1',
  name: 'Outdoor adventures',
  type: 'subject_matter',
  description: 'Videos filmed outdoors',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  collectionId: 'col-1',
  videoId: 'video-1',
  video: {
    id: 'video-1',
    name: 'GX017252.MP4',
    source: '/media/GX017252.MP4',
    thumbnailUrl: '/media/.thumbnails/GX017252.jpg',
    duration: 24,
    location: 'Paris',
    aspectRatio: '16:9',
    importAt: '2026-01-13T10:00:00Z',
  },
  ...overrides,
})

function makeFetch(body: Record<string, unknown>, status = 200): Fetcher {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('list_collections', () => {
  test('returns numbered list of collections with type labels', async () => {
    const collections = [
      makeCollection(),
      makeCollection({ id: 'col-2', name: 'Travel 2026', type: 'location' }),
    ]
    const fetch = makeFetch({ collections, total: 2 })
    const result = await handleList({}, fetch)

    const text = result.content[0].text as string
    assert.ok(text.includes('2 collections'))
    assert.ok(text.includes('Outdoor adventures'))
    assert.ok(text.includes('Travel 2026'))
    assert.ok(text.includes('[subject_matter]'))
    assert.ok(text.includes('[location]'))
  })

  test('shows "X of Y" when API returns a partial page', async () => {
    const fetch = makeFetch({ collections: [makeCollection()], total: 42 })
    const result = await handleList({}, fetch)
    assert.ok((result.content[0].text as string).includes('1 of 42 collections'))
  })

  test('passes type filter as query param using valid enum value', async () => {
    let capturedPath = ''
    const fetch: Fetcher = async (path) => {
      capturedPath = path
      return new Response(JSON.stringify({ collections: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    await handleList({ type: 'people' }, fetch)
    assert.ok(capturedPath.includes('type=people'))
  })

  test('omits type param when not provided', async () => {
    let capturedPath = ''
    const fetch: Fetcher = async (path) => {
      capturedPath = path
      return new Response(JSON.stringify({ collections: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    await handleList({}, fetch)
    assert.ok(!capturedPath.includes('type='), 'should not append type param when omitted')
  })

  test('returns empty message when no collections', async () => {
    const fetch = makeFetch({ collections: [], total: 0 })
    const result = await handleList({}, fetch)
    assert.ok((result.content[0].text as string).includes('No collections found'))
  })

  test('throws McpError on API failure', async () => {
    const fetch: Fetcher = async () => new Response('Error', { status: 500 })
    await assert.rejects(
      () => handleList({}, fetch),
      (err: Error) => err.message.includes('Failed to list collections')
    )
  })
})

describe('get_collection', () => {
  test('returns collection with video items', async () => {
    const fetch = makeFetch({ collection: makeCollection(), items: [makeItem()] })
    const result = await handleGet({ id: 'col-1' }, fetch)

    const text = result.content[0].text as string
    assert.ok(text.includes('Outdoor adventures'))
    assert.ok(text.includes('[subject_matter]'))
    assert.ok(text.includes('GX017252.MP4'))
    assert.ok(text.includes('/media/.thumbnails/GX017252.jpg'), 'should include video thumbnail')
    assert.ok(text.includes('1 video'))
  })

  test('falls back to video ID when item has no nested video', async () => {
    const item = makeItem({ video: undefined })
    const fetch = makeFetch({ collection: makeCollection(), items: [item] })
    const result = await handleGet({ id: 'col-1' }, fetch)
    assert.ok((result.content[0].text as string).includes('video-1'))
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
