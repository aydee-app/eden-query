import { uneval } from 'devalue'
import Elysia, { type Context } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import { batchPlugin, jsonTransformerPlugin } from '../../src/extensions/server/batch'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { useApp } from '../setup'

describe('http-link', () => {
  test('resolves object option headers', async () => {
    const handlePost = vi.fn(async (context: Context) => {
      console.log({ body: context.body })
      return { hello: 'POST!', value: context.body.number }
    })

    const app = new Elysia()
      .use(batchPlugin())
      .use(
        jsonTransformerPlugin({
          transformer: [
            SuperJSON,
            {
              id: 'devalue',
              serialize: uneval,
              deserialize: (object) => eval(`(${object})`),
            },
          ],
        }),
      )
      .get('/hello', () => 'GET!')
      .post('/hello', handlePost)

    useApp(app)

    const link = httpBatchLink({
      domain: 'http://localhost:3000',
      transformer: SuperJSON,
      // onRequest:
    })

    const client = new EdenClient({ links: [link] })

    const results = await Promise.all([
      client.mutation('/hello', {
        method: 'POST',
        body: {
          number: 5678n,
          hello: 'Aponia',
          yes: new File(['c', 'd', 'e'], 'yes'),
        },
      }),

      client.mutation('/hello', {
        method: 'POST',
        body: {
          number: 1234n,
          hello: 'Elysia',
          yes: new File(['a', 'b', 'c'], 'ok'),
        },
        transformer: {
          id: 'devalue',
          serialize: uneval,
          deserialize: (object) => eval(`(${object})`),
        },
      }),
    ])

    results.forEach((result, index) => {
      console.log('RESULT ' + index, result)
    })

    expect(handlePost).toHaveBeenCalledTimes(results.length)
  })
})
