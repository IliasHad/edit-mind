import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../../src/tools/suggestions.js'
import type { Fetcher } from '../../src/types.js'

const makeSuggestion = (overrides = {}) => ({
  text: 'Paris',
  type: 'location',
  count: 5,
  sceneCount: 12,
  ...overrides,
})

function makeFetch(body: unknown, status = 200): Fetcher {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('get_suggestions', () => {
  test('renders grouped suggestions when grouped data is present', async () => {
    const fetch = makeFetch({
      suggestions: [makeSuggestion()],
      grouped: { location: [makeSuggestion()] },
    })
    const result = await handle({}, fetch)
    const text = result.content[0].text as string

    assert.ok(text.includes('**location**'), 'should include group heading')
    assert.ok(text.includes('• Paris'), 'should render suggestions as bullet points')
  })

  test('groups flat suggestions by type when no grouped data', async () => {
    const fetch = makeFetch({
      suggestions: [
        makeSuggestion({ text: 'Paris', type: 'location' }),
        makeSuggestion({ text: 'Ilias', type: 'person' }),
      ],
    })
    const result = await handle({}, fetch)
    const text = result.content[0].text as string

    assert.ok(text.includes('**location**'), 'should include location group')
    assert.ok(text.includes('**person**'), 'should include person group')
    assert.ok(text.includes('Paris'))
    assert.ok(text.includes('Ilias'))
  })

  test('labels output with query when provided', async () => {
    const fetch = makeFetch({ suggestions: [makeSuggestion({ text: 'Paris' })] })
    const result = await handle({ query: 'Par' }, fetch)
    assert.ok((result.content[0].text as string).includes('Suggestions for "Par"'))
  })

  test('labels output as popular searches when no query', async () => {
    const fetch = makeFetch({ suggestions: [makeSuggestion()] })
    const result = await handle({}, fetch)
    assert.ok((result.content[0].text as string).includes('Popular searches'))
  })

  test('appends q param when query is provided', async () => {
    let capturedPath = ''
    const fetch: Fetcher = async (path) => {
      capturedPath = path
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    await handle({ query: 'Par' }, fetch)
    assert.ok(capturedPath.includes('q=Par'))
  })

  test('omits q param when no query', async () => {
    let capturedPath = ''
    const fetch: Fetcher = async (path) => {
      capturedPath = path
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    await handle({}, fetch)
    assert.ok(!capturedPath.includes('q='), 'should not append q param when query is absent')
  })

  test('returns empty message when no suggestions', async () => {
    const fetch = makeFetch({ suggestions: [] })
    const result = await handle({}, fetch)
    assert.ok((result.content[0].text as string).includes('No suggestions found'))
  })

  test('throws McpError on API failure', async () => {
    const fetch: Fetcher = async () => new Response('Error', { status: 500 })
    await assert.rejects(
      () => handle({}, fetch),
      (err: Error) => err.message.includes('Failed to get suggestions')
    )
  })
})
