import { describe, expect, test, vi } from 'vitest'

import { getFetch } from '../../src/core/fetch'

describe('getFetch', () => {
  test('returns provided fetch function if defined', () => {
    const fetch = vi.fn()

    const result = getFetch(fetch)

    expect(result).toBe(fetch)
  })

  test('returns global fetch function if none provided', () => {
    const result = getFetch()
    expect(result).toBe(globalThis.fetch)
  })

  test('throws error if no fetch implementation found', () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = undefined as any

    expect(getFetch).toThrowError()

    globalThis.fetch = originalFetch
  })
})
