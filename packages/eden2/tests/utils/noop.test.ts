import { describe, expect,test } from 'vitest'

import { asyncConstNoop, asyncNoop, constNoop, noop } from '../../src/utils/noop'

describe('noop', () => {
  test('does nothing', async () => {
    expect(noop()).toBeUndefined()
    expect(await asyncNoop()).toBeUndefined()
  })

  test('const noop returns same value', async () => {
    const value = '123'

    expect(constNoop(value)()).toBe(value)
    expect(await asyncConstNoop(value)()).toBe(value)
  })
})
