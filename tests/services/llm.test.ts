import { cleanup, generateActionFromPromptInternal } from '@/lib/services/llm'
import { describe, it, expect, afterEach } from 'vitest'
import { TEST_QUERIES, compareResults } from '../helpers/llm'

const TEST_TIMEOUT = 120000

afterEach(cleanup)

describe('Video Search Parameter Generation', () => {
  const runTest = async (query: string, expected?: Partial<any>) => {
    const result = await generateActionFromPromptInternal(query)
    if (expected) compareResults(result, expected)
  }

  describe('Core Functionality', () => {
    it('parses simple queries', () => runTest(TEST_QUERIES.simple.query, TEST_QUERIES.simple.expected), TEST_TIMEOUT)

    it(
      'handles complex multi-parameter queries',
      () => runTest(TEST_QUERIES.complex.query, TEST_QUERIES.complex.expected),
      TEST_TIMEOUT
    )

    it(
      'extracts transcription requirements',
      () => runTest(TEST_QUERIES.transcription.query, TEST_QUERIES.transcription.expected),
      TEST_TIMEOUT
    )
  })

  describe('Advanced Features', () => {
    it(
      'identifies objects in scene',
      () => runTest(TEST_QUERIES.withObjects.query, TEST_QUERIES.withObjects.expected),
      TEST_TIMEOUT
    )

    it(
      'parses multiple emotions',
      () => runTest(TEST_QUERIES.multiEmotion.query, TEST_QUERIES.multiEmotion.expected),
      TEST_TIMEOUT
    )

    it(
      'detects aspect ratio requirements',
      () => runTest(TEST_QUERIES.aspectRatio.query, TEST_QUERIES.aspectRatio.expected),
      TEST_TIMEOUT
    )
    it(
      'detects shot type requirements',
      () => runTest(TEST_QUERIES.shotType.query, TEST_QUERIES.shotType.expected),
      TEST_TIMEOUT
    )
  })
})
