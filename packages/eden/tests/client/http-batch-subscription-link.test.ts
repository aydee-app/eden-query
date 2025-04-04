import { Elysia } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test } from 'vitest'

import { EdenClient } from '../../src/client'
import { httpBatchSubscriptionLink } from '../../src/links/http-batch-subscription-link'
import { httpLink } from '../../src/links/http-link'
import { batchPlugin } from '../../src/plugins/batch'
import { transformPlugin } from '../../src/plugins/transform'
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

      console.log({ results })

      results.forEach((result, index) => {
        expect(result.data).toBe(values[index])
      })
    })
  })
})
