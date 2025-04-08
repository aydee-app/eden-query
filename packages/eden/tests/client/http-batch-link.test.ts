import assert from 'node:assert'

import { Elysia, type HTTPMethod } from 'elysia'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import type { EdenResult } from '../../src/core/dto'
import { EdenFetchError } from '../../src/core/error'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { httpLink } from '../../src/links/http-link'
import { batchPlugin } from '../../src/plugins/batch'
import { useApp } from '../setup'

describe('httpBatchLink', () => {
  describe('GET', async () => {
    test('switches to POST if any requests are not GET', async () => {
      const listener = vi.fn()

      const app = new Elysia().onRequest(listener).use(batchPlugin({ types: true, method: 'POST' }))

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

    describe('resolves requests with correct data', () => {
      test('single request', async () => {
        const data = 'Hello'

        const app = new Elysia().use(batchPlugin({ types: true })).get('/', () => data)

        useApp(app)

        const client = new EdenClient<typeof app>({
          links: [
            httpLink({
              types: true,
              domain: 'http://localhost:3000',
              method: 'GET',
            }),
          ],
        })

        const result = await client.query('/')

        expect(result.data).toBe(data)
      })

      test('multiple requests', async () => {
        const values = Array.from({ length: 5 }, (_, index) => index)

        let i = 0

        const app = new Elysia()
          .use(batchPlugin({ types: true, method: 'GET' }))
          .get('/', () => values[i++])

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

        const requester = client.query.bind(client, '/', undefined, undefined)

        const promises = values.map(requester)

        const results = await Promise.all(promises)

        expect(results.length).toBe(values.length)

        results.forEach((result, index) => {
          expect(result.data).toBe(values[index])
        })
      })
    })

    describe('can resolve batched requests with errors', () => {
      test('resolves request batch with all errors', async () => {
        const app = new Elysia().use(batchPlugin({ types: true, method: 'GET' }))

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

        const requester = client.query.bind(client, '/', undefined, undefined)

        const promises = Array.from({ length: 5 }, requester)

        const results = await Promise.allSettled(promises)

        const notFoundError = {
          value: 'NOT_FOUND',
          status: 404,
          name: 'Error',
          message: 'NOT_FOUND',
        } satisfies EdenFetchError

        results.forEach((result) => {
          expect(result.status).toBe('rejected')
          assert(result.status === 'rejected')
          expect(result.reason).toStrictEqual(notFoundError)
        })
      })

      test('resolves request batch with some errors', async () => {
        const data = 'Hello, Elysia'

        const app = new Elysia()
          .use(batchPlugin({ types: true, method: 'GET' }))
          .get('/', () => data)

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

        const validRequester = client.query.bind(client, '/')

        const invalidRequester = client.query.bind(client, '/invalid')

        const promises = Array.from({ length: 5 }, (_, index) => {
          const requester = index % 2 ? invalidRequester : validRequester
          return requester()
        })

        const results = await Promise.allSettled(promises)

        const validResult: EdenResult = {
          type: 'data',
          error: null,
          data,
          response: {} as any,
        }

        const notFoundError = {
          value: 'NOT_FOUND',
          status: 404,
          name: 'Error',
          message: 'NOT_FOUND',
        } satisfies EdenFetchError

        results.forEach((result, index) => {
          if (index % 2) {
            assert(result.status === 'rejected')
            expect(result.reason).toStrictEqual(notFoundError)
          } else {
            assert(result.status === 'fulfilled')
            expect(result.value).toStrictEqual(validResult)
          }
        })
      })
    })

    describe('serializes and deserializes individual request params correctly', () => {
      test('headers', async () => {
        const values = Array.from({ length: 5 }, (_, index) => index)

        const app = new Elysia().use(batchPlugin({ types: true, method: 'GET' }))

        const listeners = values.map((value) => {
          const listener = vi.fn()
          app.get('/' + value, listener)
          return listener
        })

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

        const requestHeaders = values.map((value) => {
          return {
            authorization: `Bearer ${value}`,
            age: value + '',
            host: value + '',
          }
        })

        const promises = requestHeaders.map(async (headers, index) => {
          const result = await client.query('/' + index, { headers })
          return result
        })

        await Promise.allSettled(promises)

        listeners.forEach((listener, index) => {
          const request: Request = listener.mock.calls[0]?.[0]?.request

          const headers = Object.fromEntries(request.headers.entries())

          const expectedHeaders = requestHeaders[index]

          assert(expectedHeaders != null)

          expect(headers).toStrictEqual(expectedHeaders)
        })
      })

      test('query parameters', async () => {
        const values = Array.from({ length: 5 }, (_, index) => index)

        const app = new Elysia().use(batchPlugin({ types: true, method: 'GET' }))

        const listeners = values.map((value) => {
          const listener = vi.fn()
          app.get('/' + value, listener)
          return listener
        })

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

        const requestQueries = values.map((value) => {
          return {
            name: value + '',
            id: value + '',
            description: value + '',
          }
        })

        const promises = requestQueries.map(async (query, index) => {
          const result = await client.query('/' + index, { query })
          return result
        })

        await Promise.allSettled(promises)

        listeners.forEach((listener, index) => {
          const request: Request = listener.mock.calls[0]?.[0]?.request

          const query = requestQueries[index]

          const url = new URL(request.url)

          assert(query != null)

          const searchParams = Object.fromEntries(url.searchParams.entries())

          expect(searchParams).toStrictEqual(query)
        })
      })

      test('HTTP method', async () => {
        const methods: HTTPMethod[] = ['GET', 'PUT', 'POST', 'PATCH', 'ACL', 'BIND', 'LOCK']

        // Because at least one of the methods is not GET, the batch request will switch to POST.
        const app = new Elysia().use(batchPlugin({ types: true, method: 'POST' }))

        const listeners = methods.map((method) => {
          const listener = vi.fn()
          app.route(method, '/', listener)
          return listener
        })

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

        const promises = methods.map(async (method) => {
          const result = await client.query('/', { method })
          return result
        })

        await Promise.allSettled(promises)

        listeners.forEach((listener) => {
          expect(listener).toHaveBeenCalledOnce()
        })
      })
    })
  })
})
