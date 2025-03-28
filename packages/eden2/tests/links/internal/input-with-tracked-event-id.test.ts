import { describe, expect, test } from 'vitest'

import { inputWithTrackedEventId } from '../../../src/links/internal/input-with-tracked-event-id'

describe('inputWithTrackedEventId', () => {
  test('does not mutate input if no lastEventId', () => {
    const input = { a: 'b', c: { d: 1 } }

    const result = inputWithTrackedEventId(input)

    expect(result).toBe(input)
  })

  test('does not mutate input if not an object', () => {
    const input = 'hello'

    const result = inputWithTrackedEventId(input, 'ID')

    expect(result).toBe(input)
  })

  test('mutates input by adding the lastEventId key if input and lastEventId are valid', () => {
    const input = {}

    const id = 'ID'

    const result = inputWithTrackedEventId(input, id)

    expect(result).toStrictEqual(expect.objectContaining({ lastEventId: id }))
  })

  test('returns new object with lastEventId key if input is null and lastEventId is valid', () => {
    const input = undefined

    const id = 'ID'

    const result = inputWithTrackedEventId(input, id)

    expect(result).toStrictEqual(expect.objectContaining({ lastEventId: id }))
  })
})
