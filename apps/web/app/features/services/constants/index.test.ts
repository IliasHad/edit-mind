import { describe, expect, it } from 'vitest'

import { BACKGROUND_JOBS_URL } from './index'

describe('BACKGROUND_JOBS_URL', () => {
  it('defaults to the current web origin instead of localhost', () => {
    expect(BACKGROUND_JOBS_URL).toBe('/')
    expect(BACKGROUND_JOBS_URL).not.toMatch(/^https?:\/\/localhost(?::|\/|$)/)
  })
})
