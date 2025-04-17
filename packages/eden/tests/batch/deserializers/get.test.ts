import type { Context } from 'elysia'
import queryString from 'query-string'
import { describe, expect,test } from 'vitest'

import { deserializeBatchGetParams } from '../../../src/batch/deserializers/get'

describe('deserializeBatchGetParams', () => {
  describe('handles request-specific params', () => {
    test('path ', async () => {
      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.path).toBe(query['0.path'])
    })

    test('query', async () => {
      const query = {
        '0.query.hello': 'world',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.input?.query?.['hello']).toBe(query['0.query.hello'])
    })

    test('ignores query if key is missing', async () => {
      const query = {
        '0.query': 'world',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.input?.query).toBeUndefined()
    })

    test('handles valid query and ignores queries without keys', async () => {
      const query = {
        '0.query': 'my-query',
        '0.query.hello': 'world',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.input?.query).toStrictEqual({ hello: 'world' })
    })

    test('headers ', async () => {
      const headers = {
        '0.auth': 'request 0 auth',
      }

      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { headers })

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.input?.headers?.['auth']).toBe(headers['0.auth'])
    })

    test('ignores designated headers', async () => {
      const headers = {
        'content-length': '123',
      }

      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { headers })

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })

    test('ignores unknown keys', async () => {
      const query = {
        '0.path': '/',
        '0.invalid': 'request invalid',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })
  })

  describe('handles global params', () => {
    test('query', async () => {
      const query = {
        '0.path': '/',
        hello: 'world',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.query?.['hello']).toBe(query.hello)
    })

    test('handles valid query and ignores queries without keys', async () => {
      const query = {
        hello: 'world',
        '0.query': 'my-query',
        '0.query.yes': 'no',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`)

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.query).toStrictEqual({ hello: 'world' })
      expect(result[0]?.input?.query).toStrictEqual({ yes: 'no' })
    })

    test('headers', async () => {
      const headers = {
        auth: 'global auth',
        '0.auth': 'request 0 auth',
      }

      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { headers })

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]?.headers).toStrictEqual({ auth: 'global auth' })
      expect(result[0]?.input?.headers?.['auth']).toBe(headers['0.auth'])
    })

    test('ignores designated headers', async () => {
      const headers = {
        '0.content-length': '123',
      }

      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { headers })

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })

    test('ignores header if invalid index', async () => {
      const headers = {
        'first.auth': '123',
      }

      const query = { '0.path': '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { headers })

      const context: Context = { request } as any

      const result = await deserializeBatchGetParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })
  })
})
