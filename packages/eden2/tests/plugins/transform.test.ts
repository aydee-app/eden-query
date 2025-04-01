import { Elysia } from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test } from 'vitest'

import { EdenClient } from '../../src/client'
import { EdenFetchError } from '../../src/core/errors'
import { httpLink } from '../../src/links/http-link'
import { transformPlugin } from '../../src/plugins/transform'
import { useApp } from '../setup'

describe('transformPlugin', () => {
  test('works', async () => {
    const response = { answer: 123n }
    const app = new Elysia().use(transformPlugin({ transformer: SuperJSON })).get('/', () => {
      return response
    })

    useApp(app)

    const link = httpLink({
      domain: 'http://localhost:3000',
      transformer: SuperJSON,
    })

    const client = new EdenClient({ links: [link] })

    const result = await client.query('/')

    expect(result.data).toStrictEqual(response)
  })

  test('works with errors', async () => {
    const status = 524

    const response = { answer: 123n }

    const app = new Elysia()
      .use(transformPlugin({ transformer: SuperJSON }))
      .get('/', (context) => {
        return context.error(status, response)
      })

    useApp(app)

    const link = httpLink({
      domain: 'http://localhost:3000',
      transformer: SuperJSON,
    })

    const client = new EdenClient({ links: [link] })

    const expectedError = new EdenFetchError(status, response)

    await expect(async () => await client.query('/')).rejects.toThrow(expectedError)
  })
})
