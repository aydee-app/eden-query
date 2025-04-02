import { describe, expect, test } from 'vitest'

import { notNull } from '../../src/utils/null'

describe('notNull', () => {
  test('returns false for nullish values', () => {
    expect(notNull()).toBeFalsy()
    expect(notNull(undefined)).toBeFalsy()
    expect(notNull(null)).toBeFalsy()
  })

  test('returns true for non-nullish values', () => {
    expect(notNull({})).toBeTruthy()
    expect(notNull('')).toBeTruthy()
    expect(notNull([])).toBeTruthy()
    expect(notNull(0)).toBeTruthy()
  })
})
