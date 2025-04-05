import { Elysia } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import type { EdenResult } from '../../src/core/dto'
import { EdenFetchError } from '../../src/core/error'
import { httpBatchSubscriptionLink } from '../../src/links/http-batch-subscription-link'
import { httpLink } from '../../src/links/http-link'
import { batchPlugin } from '../../src/plugins/batch'
import { transformPlugin } from '../../src/plugins/transform'
import { BatchInputTooLargeErro as BatchInputTooLargeError } from '../../src/utils/data-loader'
import { useApp } from '../setup'

describe('httpBatchSubscriptionLink', () => {
  describe('GET', async () => {
    test('returns correct data for single request', async () => {
      const data = 'Hello'

      const app = new Elysia()
        .use(transformPlugin({ types: true, transformer: SuperJSON }))
        .use(batchPlugin({ types: true }))
        .get('/', () => data)

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
            transformer: SuperJSON,
          }),
        ],
      })

      const result = await client.query('/')

      expect(result.data).toBe(data)
    })

    test('returns correct data for multiple requests', async () => {
      const values = Array.from({ length: 5 }, (_, index) => index)

      let i = 0

      const app = new Elysia()
        .use(batchPlugin({ types: true, method: 'GET' }))
        .get('/', () => values[i++])

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpBatchSubscriptionLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
          }),
        ],
      })

      const requester = client.query.bind(client, '/', undefined, undefined)

      const promises = values.map(requester)

      const results = await Promise.all(promises)

      results.forEach((result, index) => {
        expect(result.data).toBe(values[index])
      })
    })
  })

  describe('invariants', () => {
    test('groups items properly and uses custom batch endpoint', async () => {
      const maxItems = 2

      const groups = 3

      const length = maxItems * groups

      const values = Array.from({ length }, (_, index) => index)

      let i = 0

      const listener = vi.fn()

      const endpoint = '/custom-batch-endpoint'

      const app = new Elysia()
        .onRequest((context) => {
          const url = new URL(context.request.url)
          if (url.pathname === endpoint) listener()
        })
        .use(
          batchPlugin({
            types: true,
            method: 'GET',
            endpoint,
          }),
        )
        .get('/', () => values[i++])

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpBatchSubscriptionLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
            maxItems,
            endpoint,
          }),
        ],
      })

      const requester = client.query.bind(client, '/', undefined, undefined)

      const promises = values.map(requester)

      await Promise.all(promises)

      expect(listener).toHaveBeenCalledTimes(groups)
    })

    test('throws error if a single input is too large', async () => {
      const app = new Elysia().use(
        batchPlugin({
          types: true,
          method: 'GET',
        }),
      )

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpBatchSubscriptionLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
            maxURLLength: 0,
          }),
        ],
      })

      const promises = [client.query('/'), client.query('/')]

      await expect(async () => await Promise.all(promises)).rejects.toThrow(BatchInputTooLargeError)
    })

    test('resolves with all errors', async () => {
      const app = new Elysia().use(batchPlugin({ types: true, method: true }))

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpBatchSubscriptionLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
          }),
        ],
      })

      const listener = vi.fn()

      const promises = [client.query('/').catch(listener), client.query('/').catch(listener)]

      await Promise.all(promises)

      const notFoundError = {
        value: 'NOT_FOUND',
        status: 404,
        name: 'Error',
        message: 'NOT_FOUND',
      } satisfies EdenFetchError

      expect(listener).toHaveBeenCalledTimes(promises.length)

      promises.forEach((_, index) => {
        expect(listener).toHaveBeenNthCalledWith(index + 1, notFoundError)
      })
    })

    test.only('individually resolves errors', async () => {
      const values = Array.from({ length: 5 }, (_, index) => Boolean(index % 2))
      const data = 'Hello, Elysia'

      const app = new Elysia().use(batchPlugin({ types: true, method: true })).get('/', () => data)

      useApp(app)

      const client = new EdenClient<typeof app>({
        links: [
          httpBatchSubscriptionLink({
            types: true,
            domain: 'http://localhost:3000',
            method: 'GET',
          }),
        ],
      })

      const listener = vi.fn()

      const validRequester = client.query.bind(client, '/')

      const invalidRequester = client.query.bind(client, '/invalid')

      const promises = values.map((value) => {
        const requester = value ? invalidRequester : validRequester
        return requester().then(listener).catch(listener)
      })

      await Promise.all(promises)

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

      expect(listener).toHaveBeenCalledTimes(promises.length)

      console.log(listener.mock.calls)

      promises.forEach((_, index) => {
        const result = index % 2 ? notFoundError : validResult
        expect(listener).toHaveBeenNthCalledWith(index + 1, result)
      })
    })
  })
})
