import { uneval } from 'devalue'
import { type Context, Elysia, t } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import type { EdenResult } from '../../src/core/response'
import { batchPlugin, jsonTransformerPlugin } from '../../src/extensions/server/batch'
import { httpBatchLink } from '../../src/links/http-batch-link'
import type { DataTransformerOptions } from '../../src/trpc/server/transformer'
import { useApp } from '../setup'

describe('http-batch-link', () => {
  test('throws error if no links', async () => {
    const client = new EdenClient({ links: [] })

    await expect(async () => await client.query('/')).rejects.toThrowError()
  })

  describe('query', () => {
    test('forwards global query', async () => {
      const app = new Elysia()
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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

      const transformer: DataTransformerOptions = {
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      }

      const app = new Elysia()
        .use(jsonTransformerPlugin({ transformer }))
        .use(batchPlugin())
        .post('/text-transformer', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({
        domain: 'http://localhost:3000',
        transformer,
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
        .use(jsonTransformerPlugin({ transformer: [SuperJSON] }))
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

      const superJsonTransformer: DataTransformerOptions = {
        id: 'superjson',
        ...SuperJSON,
      }

      const devalueTransformer: DataTransformerOptions = {
        id: 'devalue',
        serialize: (object) => uneval(object),
        deserialize: (object) => eval(`(${object})`),
      }

      const app = new Elysia()
        .use(
          jsonTransformerPlugin({
            transformer: [superJsonTransformer, devalueTransformer],
          }),
        )
        .use(batchPlugin())
        .post('/hello', handlePost, { body })

      useApp(app)

      const link = httpBatchLink({ domain: 'http://localhost:3000' })

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
            transformer: index % 2 ? superJsonTransformer : devalueTransformer,
          })
        }),
      )) as EdenResult[]

      results.forEach((result, index) => {
        expect(result.data).toStrictEqual(bodies[index])
        expect(result.error).toBeNull()
      })
    })
  })
})
