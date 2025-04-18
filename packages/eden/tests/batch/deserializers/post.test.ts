import type { Context } from 'elysia'
import queryString from 'query-string'
import { describe, expect, test } from 'vitest'

import { deserializeBatchPostParams } from '../../../src/batch/deserializers/post'

describe('deserializeBatchPostParams', () => {
  describe('handles request-specific params', () => {
    test('path', async () => {
      const body = new FormData()

      const paths = ['/', '/hello', '/bye']

      paths.forEach((path, index) => {
        body.append(`${index}.path`, path)
      })

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      result.forEach((options, index) => {
        expect(options.path).toBe(paths[index])
      })
    })

    test.skip('query', async () => {
      const body = new FormData()

      const paths = ['/', '/hello', '/bye']

      paths.forEach((path, index) => {
        body.append(`${index}.path`, path)
      })

      const query = {
        '0.hello': 'world',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.query).toStrictEqual({ hello: 'world' })
    })

    test.skip('query with dots', async () => {
      const body = new FormData()

      const paths = ['/', '/hello', '/bye']

      paths.forEach((path, index) => {
        body.append(`${index}.path`, path)
      })

      const query = {
        '0.hello.world': 'yes',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.query).toStrictEqual({ 'hello.world': 'yes' })
    })

    test('ignores query without key', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const query = {
        '0.': 'yes',
      }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.query).toBeUndefined()
    })

    test('headers', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        '0.auth': 'request 0 auth',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.headers?.['auth']).toBe(headers['0.auth'])
    })

    test('ignores headers with no name', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        '0.': 'request 0 auth',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.headers).toBeUndefined()
    })

    test('ignores headers with invalid index', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        'first.auth': 'request 0 auth',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.headers).toBeUndefined()
    })

    test('ignores designated headers', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        '0.content-length': '123',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', headers, body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.input?.headers).toBeUndefined()
    })
  })

  describe('handles form data correctly', () => {
    test('captures method and path', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
        },
        {
          path: '/pa',
          method: 'PATCH',
        },
        {
          path: '/de',
          method: 'DELETE',
        },
      ]

      requests.forEach((request, index) => {
        body.append(`${index}.path`, request.path)
        body.append(`${index}.method`, request.method)
      })

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result).toStrictEqual(requests)
    })

    test('captures method and path', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
        },
        {
          path: '/pa',
          method: 'PATCH',
        },
        {
          path: '/de',
          method: 'DELETE',
        },
      ]

      requests.forEach((request, index) => {
        body.append(`${index}.path`, request.path)
        body.append(`${index}.method`, request.method)
      })

      body.append('A', 'a invalid')
      body.append('B', 'b invalid')
      body.append('C', 'c invalid')

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result).toStrictEqual(requests)
    })

    test('can handle unknown keys', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          key: 'key',
          value: 'index',
          index: '1',
        },
        {
          path: '/pa',
          method: 'PATCH',
          key: 'key',
          value: 'index',
          index: '1',
        },
        {
          path: '/de',
          method: 'DELETE',
          key: 'key',
          value: 'index',
          index: '1',
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          body.append(`${index}.${key}`, value)
        })
      })

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result).toStrictEqual(requests)
    })

    test('handles explicit json bodies', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          body: { elysia: 'aponia' },
          body_type: 'json',
        },
        {
          path: '/pa',
          method: 'PATCH',
          body: { eden: 'aponia' },
          body_type: 'json',
        },
        {
          path: '/de',
          method: 'DELETE',
          body: { pardofelis: 'money' },
          body_type: 'json',
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          if (key === 'body') {
            body.append(`${index}.${key}`, JSON.stringify(value, null, 2))
          } else {
            body.append(`${index}.${key}`, value)
          }
        })
      })

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result).toStrictEqual(requests)
    })

    test('handles explicit formdata bodies', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          body_type: 'formdata',
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          if (key === 'body') {
            body.append(`${index}.${key}`, JSON.stringify(value, null, 2))
          } else {
            body.append(`${index}.${key}`, value)
          }
        })
      })

      body.append('0.body.elysia', 'aponia')

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      const body1 = new FormData()

      body1.append('elysia', 'aponia')

      expect(result[0]?.body).toStrictEqual(body1)
    })

    test('handles json bodies with files', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          body_type: 'json',
          body: { files: [] },
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          if (key === 'body') {
            body.append(`${index}.${key}`, JSON.stringify(value, null, 2))
          } else {
            body.append(`${index}.${key}`, value as any)
          }
        })
      })

      const file = new File([], 'my-file', { type: 'custom' })

      body.append('0.files.path', 'files.0')
      body.append('0.files.files', file)

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.body).toStrictEqual({ files: [file] })
    })

    test('ignores files in json body if path not found', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          body_type: 'json',
          body: { files: [] },
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          if (key === 'body') {
            body.append(`${index}.${key}`, JSON.stringify(value, null, 2))
          } else {
            body.append(`${index}.${key}`, value as any)
          }
        })
      })

      const file = new File([], 'my-file', { type: 'custom' })

      body.append('0.files.files', file)

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.body).toStrictEqual({ files: [] })
    })

    test('ignores body if body_type specified but not body', async () => {
      const body = new FormData()

      const requests = [
        {
          path: '/p',
          method: 'POST',
          body_type: 'json',
        },
        {
          path: '/pa',
          method: 'PATCH',
          body_type: 'json',
        },
        {
          path: '/de',
          method: 'DELETE',
          body_type: 'json',
        },
      ]

      requests.forEach((request, index) => {
        Object.entries(request).forEach(([key, value]) => {
          if (key === 'body') {
            body.append(`${index}.${key}`, JSON.stringify(value, null, 2))
          } else {
            body.append(`${index}.${key}`, value)
          }
        })
      })

      const request = new Request('http://localhost:3000', { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result).toStrictEqual(requests)
    })
  })

  describe('handles global params', () => {
    test.skip('query', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const query = { yes: '/' }

      const q = queryString.stringify(query)

      const request = new Request(`http://localhost:3000?${q}`, { method: 'POST', body })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.query).toStrictEqual(query)
    })

    test('headers', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        auth: 'global auth',
        '0.auth': 'request 0 auth',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]?.headers).toStrictEqual(new Headers({ auth: 'global auth' }))
      expect(result[0]?.input?.headers?.['auth']).toBe(headers['0.auth'])
    })

    test('ignores designated headers', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        '0.content-length': '123',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })

    test('ignores header if invalid index', async () => {
      const body = new FormData()

      body.append('0.path', '/')

      const headers = {
        'first.auth': '123',
      }

      const request = new Request('http://localhost:3000', { method: 'POST', body, headers })

      const context: Context = { request } as any

      const result = await deserializeBatchPostParams(context)

      expect(result[0]).toStrictEqual({ path: '/' })
    })
  })
})
