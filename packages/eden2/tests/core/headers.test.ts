import { describe, expect, test } from 'vitest'

import type { EdenRequestHeaders } from '../../src/core/config'
import { processHeaders } from '../../src/core/headers'

describe('headers', () => {
  test('returns empty object if nothing provided', async () => {
    const result = await processHeaders()
    expect(result).toStrictEqual({})
  })

  test('merges array of objects', async () => {
    const headers = [
      {
        a: 'a',
      },
      {
        b: 'b',
      },
      {
        c: 'c',
      },
    ]

    const mergedHeaders = Object.fromEntries(headers.flatMap(Object.entries))

    const result = await processHeaders(headers)

    expect(result).toStrictEqual(mergedHeaders)
  })

  test('merges array of Header objects', async () => {
    const headers = [new Headers({ a: 'a' }), new Headers({ b: 'b' }), new Headers({ c: 'c' })]

    const mergedHeaders = Object.fromEntries(headers.flatMap((h) => h.entries().toArray()))

    const result = await processHeaders(headers)

    expect(result).toStrictEqual(mergedHeaders)
  })

  test('merges array of array of entries', async () => {
    const headers = [
      [
        ['a', 'a'],
        ['b', 'b'],
        ['c', 'c'],
      ],
      [
        ['d', 'd'],
        ['e', 'e'],
        ['f', 'f'],
      ],
    ] satisfies EdenRequestHeaders

    const mergedHeaders = Object.fromEntries(headers.flat())

    const result = await processHeaders(headers)

    expect(result).toStrictEqual(mergedHeaders)
  })

  test('merges array of functions that return array of entries', async () => {
    const headers = [
      () => new Headers({ a: 'a' }),
      () => new Headers({ b: 'b' }),
      () => new Headers({ c: 'c' }),
    ] satisfies EdenRequestHeaders

    const mergedHeaders = Object.fromEntries(headers.flatMap((h) => h().entries().toArray()))

    const result = await processHeaders(headers)

    expect(result).toStrictEqual(mergedHeaders)
  })

  test('merges array of array of functions that return Header objects', async () => {
    const headers = [
      [
        ['a', 'a'],
        ['b', 'b'],
        ['c', 'c'],
      ],
      [
        ['d', 'd'],
        ['e', 'e'],
        ['f', 'f'],
      ],
    ] satisfies EdenRequestHeaders

    const mergedHeaders = Object.fromEntries(headers.flat())

    const result = await processHeaders(headers)

    expect(result).toStrictEqual(mergedHeaders)
  })

  test('does not change headers if nothing returned from function', async () => {
    const initialHeaders = { a: 'a', b: 'b', c: 'c' }

    const headers = (() => {}) satisfies EdenRequestHeaders

    const result = await processHeaders(headers, {}, initialHeaders)

    expect(result).toStrictEqual(initialHeaders)
  })

  test('does not change headers if invalid value', async () => {
    const initialHeaders = { a: 'a', b: 'b', c: 'c' }

    const result = await processHeaders('hello', {}, initialHeaders)

    expect(result).toStrictEqual(initialHeaders)
  })
})
