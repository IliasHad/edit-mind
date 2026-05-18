import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../../src/tools/media.js'
import type { Fetcher } from '../../src/types.js'

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makeImageFetch(base64: string): Fetcher {
  return async () =>
    new Response(Buffer.from(base64, 'base64'), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
}

describe('view_media', () => {
  test('returns image content for image files', async () => {
    const result = await handle({ source: '/media/.thumbnails/scene.jpg' }, makeImageFetch(PNG_1X1))

    assert.equal(result.content.length, 2)
    assert.equal(result.content[0].type, 'text')
    assert.equal(result.content[1].type, 'image')
    const img = result.content[1] as { type: string; mimeType: string; data: string }
    assert.equal(img.mimeType, 'image/png')
    assert.ok(img.data.length > 0, 'should include base64 data')
  })

  test('returns error content on 404', async () => {
    const fetch: Fetcher = async () => new Response('', { status: 404 })
    const result = await handle({ source: '/missing.jpg' }, fetch)

    assert.ok(result.isError)
    assert.ok((result.content[0].text as string).includes('not found'))
  })

  test('returns error content on 403', async () => {
    const fetch: Fetcher = async () => new Response('', { status: 403 })
    const result = await handle({ source: '/secret.jpg' }, fetch)

    assert.ok(result.isError)
    assert.ok((result.content[0].text as string).includes('Access denied'))
  })

  test('returns video info for video content-type', async () => {
    const fetch: Fetcher = async () =>
      new Response(Buffer.alloc(1024 * 1024), {
        status: 200,
        headers: { 'content-type': 'video/mp4', 'content-length': '1048576' },
      })
    const result = await handle({ source: '/media/video.mp4' }, fetch)

    assert.equal(result.content.length, 1)
    const text = result.content[0].text as string
    assert.ok(text.includes('Video file'))
    assert.ok(text.includes('1024 KB'))
  })

  test('throws McpError when source is missing', async () => {
    const fetch: Fetcher = async () => new Response('', { status: 200 })
    await assert.rejects(
      () => handle({}, fetch),
      (err: Error) => err.message.includes('source is required')
    )
  })

  test('URL-encodes the source path', async () => {
    let capturedPath = ''
    const fetch: Fetcher = async (path) => {
      capturedPath = path
      return new Response(Buffer.from(PNG_1X1, 'base64'), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    }

    await handle({ source: '/media/my video/scene.jpg' }, fetch)
    assert.ok(capturedPath.includes('my%20video'), 'should URL-encode spaces')
  })
})
