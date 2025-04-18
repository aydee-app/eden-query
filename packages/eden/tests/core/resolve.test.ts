import assert from 'node:assert'

import { Elysia } from 'elysia'
import queryString from 'query-string'
import SuperJSON from 'superjson'
import { describe, expect, test, vi } from 'vitest'

import type { EdenResponseTransformer } from '../../src/core/config'
import type { EdenResult } from '../../src/core/dto'
import {
  defaultOnRequest,
  defaultOnResponse,
  defaultOnResult,
  resolveEdenFetchPath,
  resolveEdenRequest,
  resolveFetchOptions,
} from '../../src/core/resolve'

describe('defaultOnRequest', () => {
  test('does nothing if body is null', async () => {
    const init = {} satisfies RequestInit

    const originalInit = { ...init }

    const result = await defaultOnRequest('/', init, {})

    expect(result).toBeUndefined()
    expect(init).toStrictEqual(expect.objectContaining(originalInit))
  })

  test('does nothing if body is FormData', async () => {
    const init = {
      body: new FormData(),
    } satisfies RequestInit

    const originalInit = { ...init }

    const result = await defaultOnRequest('/', init, {})

    expect(result).toBeUndefined()
    expect(init).toStrictEqual(expect.objectContaining(originalInit))
  })

  test('converts body to FormData if object has file at the top level', async () => {
    const body = {
      file: new File([], 'file'),
    }

    const originalBody = { ...body }

    const init = { body }

    const result = await defaultOnRequest('/', init as any, {})

    expect(result).toBeUndefined()
    expect(body).toStrictEqual(originalBody)
    expect(init.body).toBeInstanceOf(FormData)

    assert(init.body instanceof FormData)

    expect(init.body.get('body.file')).toBe(body.file)
  })

  test('converts body to JSON string if object', async () => {
    const body = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const originalBody = { ...body }

    const init = { body }

    const result = await defaultOnRequest('/', init as any, {})

    expect(result).toBeUndefined()
    expect(body).toStrictEqual(originalBody)
    expect(init.body).toBeTypeOf('string')
    expect(init).toStrictEqual({
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  })

  test('uses transformer with JSON serialization', async () => {
    const body = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const originalBody = { ...body }

    const init = { body }

    const result = await defaultOnRequest('/', init as any, {
      transformer: SuperJSON,
    })

    expect(result).toBeUndefined()
    expect(body).toStrictEqual(originalBody)
    expect(init.body).toBeTypeOf('string')
    expect(init).toStrictEqual({
      headers: {
        'content-type': 'application/json',
        transformed: 'true',
      },
      body: JSON.stringify(SuperJSON.serialize(body)),
    })
  })

  test('sets transformer ID if defined', async () => {
    const body = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const originalBody = { ...body }

    const init = { body }

    const transformer = { id: 'superjson', ...SuperJSON }

    const result = await defaultOnRequest('/', init as any, { transformer })

    expect(result).toBeUndefined()
    expect(body).toStrictEqual(originalBody)
    expect(init.body).toBeTypeOf('string')
    expect(init).toStrictEqual({
      headers: {
        'content-type': 'application/json',
        transformed: 'true',
        'transformer-id': transformer.id,
      },
      body: JSON.stringify(SuperJSON.serialize(body)),
    })
  })

  test('uses special transformer ', async () => {
    const body = {
      string: 'string',
      object: {
        number: 123,
      },
      file: new File([], 'file'),
    }

    const originalBody = { ...body }

    const init = { body }

    const result = await defaultOnRequest('/', init as any, { transformer: SuperJSON })

    expect(result).toBeUndefined()
    expect(body).toStrictEqual(originalBody)
    expect(init.body).toBeInstanceOf(FormData)

    assert(init.body instanceof FormData)

    const serializedBody = init.body.get('body')

    expect(serializedBody).toBe(JSON.stringify(SuperJSON.serialize(body)))

    const expectedBody = new FormData()

    expectedBody.append('body', JSON.stringify(SuperJSON.serialize(body)))
    expectedBody.append('files.file', body.file)
    expectedBody.append('files.path', 'file')

    expect(init).toStrictEqual({
      body: expectedBody,
      headers: {
        transformed: 'true',
      },
    })

    const files = init.body.getAll('files.file')

    expect(files).toHaveLength(1)
    expect(files[0]).toBe(body.file)
  })
})

describe('defaultOnResponse', () => {
  test('returns error for status above 400', async () => {
    const response = new Response('', { status: 599 })
    await expect(async () => await defaultOnResponse(response)).rejects.toThrow()
  })

  test('returns error for status below 400', async () => {
    const response = new Response('', { status: 398 })
    await expect(defaultOnResponse(response)).resolves.not.toThrow()
  })
})

describe('defaultOnResult', () => {
  test('does not apply transformer if not provided', async () => {
    const result: EdenResult = {
      type: 'data',
      error: null,
      data: {},
      response: new Response(),
    }

    const originalResult = { ...result }

    const transformerResult = await defaultOnResult(result, {})

    expect(transformerResult).toBeUndefined()
    expect(result).toStrictEqual(originalResult)
  })

  test('does applies transformer if provided', async () => {
    const rawData = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const data = SuperJSON.serialize(rawData)

    const result: EdenResult = {
      type: 'data',
      error: null,
      data,
      response: new Response(),
    }

    const originalResult = { ...result }

    const transformerResult = await defaultOnResult(result, { transformer: SuperJSON })

    expect(transformerResult).toBeUndefined()
    expect(result).toStrictEqual({ ...originalResult, data: rawData })
  })
})

describe('resolveEdenFetchPath', () => {
  test('replaces defined parameters correctly', () => {
    const path = '/users/:userId/posts/:postId'

    const params = {
      userId: 'USER',
      postId: 'POST',
    }

    const result = resolveEdenFetchPath({ path, input: { params } })

    const expectedResult = path.replace(':userId', params.userId).replace(':postId', params.postId)

    expect(result).toBe(expectedResult)
  })

  test('ignores undefined parameters', () => {
    const path = '/users/:userId/posts/:postId'

    const params = {
      userId: 'USER',
    }

    const result = resolveEdenFetchPath({ path, input: { params } })

    const expectedResult = path.replace(':userId', params.userId)

    expect(result).toBe(expectedResult)
  })

  test('returns original path (undefined) if parameters provided but no path', () => {
    const params = {
      userId: 'USER',
    }

    const path = undefined

    const result = resolveEdenFetchPath({ path, input: { params } })

    expect(result).toBe(path)
  })

  test('returns original path (string) if parameters provided but no path', () => {
    const params = {
      userId: 'USER',
    }

    const path = '/hello/world'

    const result = resolveEdenFetchPath({ path, input: { params } })

    expect(result).toBe(path)
  })

  test('returns undefined if path and parameters not provided', () => {
    const result = resolveEdenFetchPath({})
    expect(result).toBeUndefined()
  })
})

describe('resolveFetchOptions', () => {
  test('returns nothing if nothing is provided', async () => {
    const result = await resolveFetchOptions()

    expect(result).toStrictEqual({
      fetchInit: {
        headers: {},
      },
      onResponse: [defaultOnResponse],
      onResult: [defaultOnResult],
      path: '',
      query: '',
    })
  })

  test('returns uppercase method if provided', async () => {
    const method = 'get'

    const result = await resolveFetchOptions({ method })

    expect(result.fetchInit.method).toBe(method.toUpperCase())
  })

  test('adds query from root options', async () => {
    const query = {
      hello: 'world',
      name: 'elysia',
    }

    const result = await resolveFetchOptions({ query })

    expect(result.query).toBe(queryString.stringify(query))
  })

  test('adds query from request options', async () => {
    const query = {
      hello: 'world',
      name: 'elysia',
    }

    const result = await resolveFetchOptions({ input: { query } })

    expect(result.query).toBe(queryString.stringify(query))
  })

  test('merges query from root options and request options', async () => {
    const rootQuery = {
      hello: 'world',
      name: 'elysia',
    }

    const requestQuery = {
      abc: 'def',
      aponia: 'true',
    }

    const result = await resolveFetchOptions({ query: rootQuery, input: { query: requestQuery } })

    expect(result.query).toBe(
      queryString.stringify({ ...rootQuery, ...requestQuery }, { sort: false }),
    )
  })

  describe('defaultOnRequest', () => {
    test('does nothing if body is FormData', async () => {
      const init = {
        body: new FormData(),
      } satisfies RequestInit

      const originalInit = { ...init }

      const result = await resolveFetchOptions({ ...init })

      expect(result.fetchInit.body).toBe(originalInit.body)
    })

    test('converts body to FormData if object has file at the top level', async () => {
      const body = {
        file: new File([], 'file'),
      }

      const init = { body }

      const result = await resolveFetchOptions(init)

      expect(result.fetchInit.body).toBeInstanceOf(FormData)

      assert(result.fetchInit.body instanceof FormData)

      expect(result.fetchInit.body.get('body.file')).toBe(body.file)
    })

    test('converts body to JSON string if object', async () => {
      const body = {
        string: 'string',
        object: {
          number: 123,
        },
      }

      const init = { body }

      const result = await resolveFetchOptions(init)

      expect(result.fetchInit.body).toBe(JSON.stringify(body))
      expect(result.fetchInit.headers).toStrictEqual(
        expect.objectContaining({ 'content-type': 'application/json' }),
      )
    })
  })

  describe('onRequest', () => {
    test('merges options generated from onRequest', async () => {
      const init: RequestInit = {
        method: 'CUSTOM-METHOD',
      }

      const result = await resolveFetchOptions({
        onRequest() {
          return init
        },
      })

      expect(result.fetchInit).toStrictEqual(expect.objectContaining(init))
    })
  })
})

describe('resolveEdenRequest', () => {
  test('throws error if unable to construct valid URL', async () => {
    await expect(async () => await resolveEdenRequest()).rejects.toThrow()
  })

  test('handles query', async () => {
    const fetcher = vi.fn()

    const query = {
      hello: 'world',
    }

    await resolveEdenRequest({ fetcher, query })

    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      '/?' + queryString.stringify(query),
      expect.anything(),
    )
  })

  test('adds string domain to path', async () => {
    const fetcher = vi.fn()

    const domain = 'http://e.ly'

    const query = {
      hello: 'world',
    }

    await resolveEdenRequest({ domain, fetcher, query })

    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      domain + '/?' + queryString.stringify(query),
      expect.anything(),
    )
  })

  test('calls application handle function when passed as domain', async () => {
    const fetcher = vi.fn()

    const domain = new Elysia()

    const query = {
      hello: 'world',
    }

    const spy = vi.spyOn(domain, 'handle')

    const base = 'http://e.ly'

    await resolveEdenRequest({ domain, fetcher, query, base })

    expect(fetcher).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledOnce()
  })

  test('returns data from custom onResponse', async () => {
    const response = new Response()

    const fetcher = vi.fn(() => response)

    const spy = vi.spyOn(response, 'clone')

    const data = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const result = await resolveEdenRequest({
      fetcher,
      onResponse: () => {
        return data
      },
    })

    expect(spy).not.toHaveBeenCalled()
    expect(result.data).toBe(data)
  })

  test('clones response if onResponse does not return data', async () => {
    const response = new Response()

    // Keep the same instance with the spy.
    response.clone = () => response

    const fetcher = vi.fn(() => response)

    const spy = vi.spyOn(response, 'clone')

    const data = {
      string: 'string',
      object: {
        number: 123,
      },
    }

    const onResponse: EdenResponseTransformer[] = [
      () => {},
      () => {},
      () => {},
      () => {},
      () => {
        return data
      },
    ]

    const result = await resolveEdenRequest({ fetcher, onResponse })

    expect(spy).toHaveBeenCalledTimes(onResponse.length - 1)
    expect(result.data).toBe(data)
  })
})
