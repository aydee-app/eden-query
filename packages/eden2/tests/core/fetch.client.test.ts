/**
 * @vitest-environment happy-dom
 */

import { describe, expect,test } from 'vitest'

import { getFetch } from '../../src/core/fetch'

describe('getFetch', () => {
  test('returns window fetch function if none provided', () => {
    const result = getFetch()
    expect(result).toBe(window.fetch)
  })

  test('throws error if no fetch implementation found', () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = undefined as any

    expect(getFetch).toThrowError()

    globalThis.fetch = originalFetch
  })
})
