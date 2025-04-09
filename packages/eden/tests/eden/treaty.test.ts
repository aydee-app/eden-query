import { Elysia } from 'elysia'
import { describe, expect,test } from 'vitest'

import { edenTreaty } from '../../src/eden/treaty'
import { useApp } from '../setup'

describe('treaty', () => {
  test('works', async () => {
    const data = 'Hello, Elysia'

    const app = new Elysia().get('/', () => data)

    useApp(app)

    const treaty = edenTreaty<typeof app>('http://localhost:3000')

    const result = await treaty.index.get()

    expect(result.data).toBe(data)
  })
})
