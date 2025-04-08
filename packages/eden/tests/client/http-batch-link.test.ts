import { Elysia } from 'elysia'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { batchPlugin } from '../../src/plugins/batch'
import { useApp } from '../setup'

describe('httpBatchLink', () => {
  test('switches to POST if any requests are not GET', async () => {
    const listener = vi.fn()

    const app = new Elysia().onRequest(listener).use(batchPlugin({ types: true }))

    useApp(app)

    const client = new EdenClient<typeof app>({
      links: [
        httpBatchLink({
          types: true,
          domain: 'http://localhost:3000',
          method: 'GET',
        }),
      ],
    })

    await Promise.allSettled([
      client.query('/', { method: 'GET' }),
      client.query('/', { method: 'POST' }),
    ])

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          url: 'http://localhost:3000/batch',
          method: 'POST',
        }),
      }),
    )
  })
})
