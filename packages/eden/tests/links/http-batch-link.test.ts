import assert from 'node:assert'

import { jsonlStreamConsumer, jsonlStreamProducer } from '@trpc/server/unstable-core-do-not-import'
import { uneval } from 'devalue'
import { type Context, Elysia, t } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import type { EdenResponse, EdenResult } from '../../src/core/dto'
import type { AnyDataTransformer } from '../../src/core/transform'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { httpBatchSubscriptionLink } from '../../src/links/http-batch-subscription-link'
import { batchPlugin } from '../../src/plugins/batch'
import { transformPlugin } from '../../src/plugins/transform'
import { sleep } from '../../src/utils/sleep'
import { useApp } from '../setup'

const devalue: AnyDataTransformer = {
  serialize: (object) => uneval(object),
  deserialize: (object) => eval(`(${object})`),
}

describe('http-batch-link', () => {
  test('throws error if no links', async () => {
    const client = new EdenClient({ links: [] })

    await expect(async () => await client.query('/')).rejects.toThrowError()
  })

  describe('query', () => {
    test('forwards global query', async () => {
      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .get('/', (context) => {
          return context.query
        })

      useApp(app)

      const query = { hello: 'yes' }

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        query,
      })

      const client = new EdenClient({ links: [link] })

      const results = (await Promise.all([client.query('/'), client.query('/')])) as EdenResult[]

      results.forEach((result) => {
        expect(result.data).toStrictEqual(query)
      })
    })
  })

  describe('headers', () => {
    test('forwards global headers', async () => {
      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .get('/', (context) => {
          return context.headers
        })

      useApp(app)

      const headers = { hello: 'yes' }

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        headers,
      })

      const client = new EdenClient({ links: [link] })

      const results = (await Promise.all([client.query('/'), client.query('/')])) as EdenResult[]

      results.forEach((result) => {
        expect(result.data).toStrictEqual(expect.objectContaining(headers))
      })
    })
  })

  test('throws error on subscription', async () => {
    const link = httpBatchLink({ domain: 'http://localhost:3000' })

    const client = new EdenClient({ links: [link] })

    expect(() => client.subscription('/')).toThrowError()
  })

  describe('query', () => {
    test('works', async () => {
      const query = t.Object({
        id: t.String(),
        name: t.String(),
      })

      type Query = typeof query.static

      const handleGet = vi.fn(async (context: Context<{ query: Query }>) => {
        return context.query
      })

      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .get('/query', handleGet, { query })

      useApp(app)

      const link = httpBatchLink({ domain: 'http://localhost:3000' })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 10 }, (_, i) => i)

      const queries: Query[] = values.map((value) => {
        return {
          id: `${value}`,
          name: `${value}`,
        }
      })

      const results = (await Promise.all(
        queries.map(async (query) => {
          return client.query('/query', { options: { query } })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(
          expect.objectContaining({
            id: queries[index]?.id,
            name: queries[index]?.name,
          }),
        )
        expect(result.error).toBeNull()
      })
    })
  })

  describe('transformers', () => {
    test('works with FormData requests', async () => {
      const body = t.Object({
        id: t.BigInt(),
        name: t.String(),
        file: t.File(),
      })

      type Body = typeof body.static

      const handlePost = vi.fn(async (context: Context<{ body: Body }>) => {
        return context.body
      })

      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .post('/json-transformer', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformer: SuperJSON,
      })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 10 }, (_, i) => i)

      const bodies: Body[] = values.map((value) => {
        return {
          id: BigInt(value),
          name: `${value}`,
          file: new File([`${value}`], `file-${value}`),
        }
      })

      const results = (await Promise.all(
        bodies.map(async (body) => {
          return client.mutation('/json-transformer', { method: 'POST', body })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(
          expect.objectContaining({
            id: bodies[index]?.id,
            name: bodies[index]?.name,
          }),
        )
        expect(result.error).toBeNull()
      })
    })

    test('works with JSON transformer', async () => {
      const body = t.Object({
        id: t.BigInt(),
        name: t.String(),
      })

      type Body = typeof body.static

      const handlePost = vi.fn(async (context: Context<{ body: Body }>) => {
        return context.body
      })

      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .post('/json-transformer', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformer: SuperJSON,
      })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 1 }, (_, i) => i)

      const bodies: Body[] = values.map((value) => {
        return {
          id: BigInt(value),
          name: `${value}`,
        }
      })

      const results = (await Promise.all(
        bodies.map(async (body) => {
          return client.mutation('/json-transformer', { method: 'POST', body })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(bodies[index])
        expect(result.error).toBeNull()
      })
    })

    test('works with text transformer', async () => {
      const body = t.Object({
        id: t.BigInt(),
        name: t.String(),
      })

      type Body = typeof body.static

      const handlePost = vi.fn(async (context: Context<{ body: Body }>) => {
        return context.body
      })

      const app = new Elysia()
        .use(transformPlugin({ transformer: devalue }))
        .use(batchPlugin())
        .post('/text-transformer', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformer: devalue,
      })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 2 }, (_, i) => i)

      const bodies: Body[] = values.map((value) => {
        return {
          id: BigInt(value),
          name: `${value}`,
        }
      })

      const results = (await Promise.all(
        bodies.map(async (body) => {
          return client.mutation('/text-transformer', { method: 'POST', body })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(bodies[index])
        expect(result.error).toBeNull()
      })
    })

    test('works with global transformer', async () => {
      const body = t.Object({
        id: t.BigInt(),
        name: t.String(),
      })

      type Body = typeof body.static

      const handlePost = vi.fn(async (context: Context<{ body: Body }>) => {
        return context.body
      })

      const app = new Elysia()
        .use(transformPlugin({ transformer: SuperJSON }))
        .use(batchPlugin())
        .post('/hello', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformer: SuperJSON,
      })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 2 }, (_, i) => i)

      const bodies: Body[] = values.map((value) => {
        return {
          id: BigInt(value),
          name: `${value}`,
        }
      })

      const results = (await Promise.all(
        bodies.map(async (body) => {
          return client.mutation('/hello', { method: 'POST', body })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(bodies[index])
        expect(result.error).toBeNull()
      })
    })

    test('works with request-specific transformer', async () => {
      const body = t.Object({
        id: t.BigInt(),
        name: t.String(),
      })

      type Body = typeof body.static

      const handlePost = vi.fn(async (context: Context<{ body: Body }>) => {
        return context.body
      })

      const app = new Elysia()
        .use(transformPlugin({ transformers: { SuperJSON, devalue } }))
        .use(batchPlugin())
        .post('/hello', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformers: { SuperJSON, devalue },
      })

      const client = new EdenClient({ links: [link] })

      const values = Array.from({ length: 10 }, (_, i) => i)

      const bodies: Body[] = values.map((value) => {
        return {
          id: BigInt(value),
          name: `${value}`,
        }
      })

      const results = (await Promise.all(
        bodies.map(async (body, index) => {
          return client.mutation('/hello', {
            method: 'POST',
            body,
            transformer: index % 2 ? SuperJSON : devalue,
          })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(bodies[index])
        expect(result.error).toBeNull()
      })
    })

    test('batch stream', async () => {
      vi.useFakeTimers()

      let i = 1

      const interval = 1_000

      const values = Array.from({ length: 5 }, (_, index) => index)

      const app = new Elysia()
        .use(transformPlugin({ transformers: { SuperJSON, devalue } }))
        .use(batchPlugin())
        .get('/', async () => {
          const id = i++
          await sleep(id * interval)
          return id
        })

      useApp(app)

      const client = new EdenClient({
        links: [
          httpBatchSubscriptionLink({
            domain: 'http://localhost:3000',
          }),
        ],
      })

      const listener = vi.fn()

      const promises = values.map((_value) => client.query('/').then(listener))

      for (const value of values) {
        await vi.advanceTimersByTimeAsync(interval)
        expect(listener).toHaveBeenCalledTimes(value + 1)
        expect(listener).toHaveBeenLastCalledWith(
          expect.objectContaining({
            data: value + 1,
          }),
        )
      }

      await Promise.all(promises)

      values.forEach((value) => {
        expect(listener).toHaveBeenNthCalledWith(
          value + 1,
          expect.objectContaining({
            data: value + 1,
          }),
        )
      })

      vi.useRealTimers()
    })

    test('stream', async () => {
      const results = Array.from({ length: 5 }, (_, index) => index)

      const app = new Elysia()
        .use(transformPlugin({ transformers: { SuperJSON, devalue } }))
        .use(batchPlugin())
        .get('/', (context) => {
          context.set.headers['content-type'] = 'text/event-stream'
          context.set.headers['transfer-encoding'] = 'chunked'

          const data = results.map(async (value, index) => {
            await sleep(index * 500)

            const result: EdenResult = {
              type: 'data',
              data: value,
              response: {} as any,
            }

            return { result }
          })

          const stream = jsonlStreamProducer({ data })

          // const iterable = readableStreamToAsyncIterable(stream)

          // for await (const item of iterable) {
          //   yield item
          // }

          return new Response(stream)
        })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformers: { SuperJSON, devalue },
      })

      const client = new EdenClient({ links: [link] })

      const result = await client.query('/')

      assert(result.type === 'data' && result.response.body)

      const abortController = new AbortController()

      const [head] = await jsonlStreamConsumer<Record<string, Promise<any>>>({
        from: result.response.body,
        abortController,
      })

      const expects = results.map(async (result, index) => {
        const response: EdenResponse = await Promise.resolve(head[index])

        assert(response.result?.type === 'data')

        expect(response.result.data).toBe(result)
      })

      await Promise.all(expects)
    })
  })
})

export async function* readableStreamToAsyncIterable<T>(
  stream: ReadableStream<T>,
): AsyncIterable<T> {
  const reader = stream.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
