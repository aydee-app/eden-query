import { attest } from '@ark/attest'
import type { QueryFunction } from '@tanstack/query-core'
import { Elysia, t } from 'elysia'
import { describe, expectTypeOf, test, vi } from 'vitest'

import { edenFetchTanstackQuery } from '../src/fetch'

const recursiveProxy: any = new Proxy(() => {}, {
  get: () => recursiveProxy,
  apply: () => recursiveProxy,
})

vi.mock('../src/fetch', async (importOriginal) => {
  return {
    ...(await importOriginal()),
    edenFetchTanstackQuery: () => recursiveProxy,
  }
})

describe('edenFetchTanstackQuery', () => {
  test('allows a maximum of three arguments', () => {
    const app = new Elysia().get('/', 'Hello')

    const fetch = edenFetchTanstackQuery<typeof app>()

    attest(() => {
      // @ts-expect-error Needs at least two arguments because the second one specifies HTTP method.
      fetch('/index', {}, {}, {})
    }).type.errors('Expected 1-3 arguments, but got 4.')
  })

  test('infers correct response value', async () => {
    const data = 'GET' as const

    const app = new Elysia().get('/', data)

    const fetch = edenFetchTanstackQuery<typeof app>()

    const response = fetch('/index')

    type Result = NonNullable<Awaited<typeof response>['data']>

    expectTypeOf<typeof data>().toEqualTypeOf<Result>()
  })

  describe('HTTP method', () => {
    test('does not require second argument if endpoint includes GET', async () => {
      const app = new Elysia().get('/', 'GET').post('/', 'POST')

      const fetch = edenFetchTanstackQuery<typeof app>()

      fetch('/index')
    })

    test('requires second argument if endpoint does not include GET', async () => {
      const app = new Elysia().post('/', 'POST')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Needs at least two arguments because the second one specifies HTTP method.
        fetch('/index')
      }).type.errors('Expected 2-3 arguments, but got 1.')
    })

    test('requires method to be defined in second argument if endpoint does not include GET', async () => {
      const app = new Elysia().post('/', 'POST')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Needs to have method property.
        fetch('/index', {})
      }).type.errors(
        "Property 'method' is missing in type '{}' but required in type '{ method: \"POST\"; }'.",
      )
    })

    test('requires correct method in second argument if endpoint does not include GET', async () => {
      const app = new Elysia().post('/', 'POST')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Wrong HTTP method.
        fetch('/index', { method: 'PATCH' })
      }).type.errors('Type \'"PATCH"\' is not assignable to type \'"POST"\'.')
    })

    test('accepts correct method in second argument when endpoint does not include GET', async () => {
      const app = new Elysia().post('/', 'POST')

      const fetch = edenFetchTanstackQuery<typeof app>()

      fetch('/index', { method: 'POST' })
    })
  })

  describe('params', () => {
    test('requires second argument', () => {
      const app = new Elysia().get('/posts/:id', 'POST ID')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Needs at least two arguments because the second one has params.
        fetch('/posts/:id')
      }).type.errors('Expected 2-3 arguments, but got 1.')
    })

    test('requires second argument with params property', () => {
      const app = new Elysia().get('/posts/:id', 'POST ID')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error params property needs to be defined.
        fetch('/posts/:id', {})
      }).type.errors(
        "Property 'params' is missing in type '{}' but required in type '{ params: { id: string; }; }'.",
      )
    })

    test('requires second argument with params property with one required key', () => {
      const app = new Elysia().get('/posts/:id', 'POST ID')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error The id param needs to be assigned a value.
        fetch('/posts/:id', { params: {} })
      }).type.errors(
        "Property 'id' is missing in type '{}' but required in type '{ id: string; }'.",
      )
    })

    test('requires second argument with params property with one required key assigned to string or number', () => {
      const app = new Elysia().get('/posts/:id', 'POST ID')

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Boolean is not string.
        fetch('/posts/:id', { params: { id: false } })
      }).type.errors("Type 'boolean' is not assignable to type 'string'.")

      attest(() => {
        // @ts-expect-error null is not string.
        fetch('/posts/:id', { params: { id: null } })
      }).type.errors("Type 'null' is not assignable to type 'string'.")

      attest(() => {
        // @ts-expect-error undefined is not string.
        fetch('/posts/:id', { params: { id: undefined } })
      }).type.errors("Type 'undefined' is not assignable to type 'string'.")

      attest(() => {
        // @ts-expect-error object is not string.
        fetch('/posts/:id', { params: { id: {} } })
      }).type.errors("Type '{}' is not assignable to type 'string'.")

      attest(() => {
        // @ts-expect-error number is not string.
        // NOTE: Elysia.js describes params as strings, but Eden will allow numbers.
        fetch('/posts/:id', { params: { id: 123 } })
      }).type.errors("Type 'number' is not assignable to type 'string'.")

      fetch('/posts/:id', { params: { id: '123' } })
    })

    test('works with formatted separator', () => {
      const app = new Elysia().get('/posts/:id', 'POST ID')

      const fetch = edenFetchTanstackQuery<typeof app>().types({ separator: '$$param$$' })

      fetch('/posts/$$id$$', { params: { id: '' } })
    })
  })

  describe('query', () => {
    test('does not require second argument if all query optional', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.Optional(t.String()),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      fetch('/index')
    })

    test('does not require second argument if all queries are optional', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.Optional(t.String()),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      fetch('/index')
    })

    test('requires second argument if any query is required', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.String(),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Needs at least two arguments because the second one specifies query.
        fetch('/index')
      }).type.errors('Expected 2-3 arguments, but got 1.')
    })

    test('requires second argument with query property if query is required', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.String(),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error query property needs to be defined.
        fetch('/index', {})
      }).type.errors(
        "Property 'query' is missing in type '{}' but required in type '{ query: Omit<{ name: string; }, never>; }'.",
      )
    })

    test('requires second argument with query property if query is required', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.String(),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      attest(() => {
        // @ts-expect-error Query is missing name.
        fetch('/index', { query: {} })
      }).type.errors(
        "Property 'name' is missing in type '{}' but required in type 'Omit<{ name: string; }, never>'.",
      )
    })

    test('requires second argument with valid query property', () => {
      const app = new Elysia().get('/', 'Hello, Elysia', {
        query: t.Object({
          name: t.String(),
        }),
      })

      const fetch = edenFetchTanstackQuery<typeof app>()

      fetch('/index', { query: { name: '' } })
    })
  })

  describe('queryOptions', () => {
    test('infers response data', () => {
      const data = 'Hello, Elysia' as const

      const app = new Elysia().get('/', data)

      const fetch = edenFetchTanstackQuery<typeof app>()

      const queryOptions = fetch.queryOptions('/index')

      expectTypeOf<typeof queryOptions>().toExtend<{
        queryKey: any
        queryFn: QueryFunction<typeof data, any, never>
        retry?: any
      }>()
    })

    describe('query', () => {
      test('does not require second argument if all query optional', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.Optional(t.String()),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        fetch.queryOptions('/index')
      })

      test('does not require second argument if all queries are optional', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.Optional(t.String()),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        fetch.queryOptions('/index')
      })

      test('requires second argument if any query is required', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.String(),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error Needs at least two arguments because the second one specifies query.
          fetch.queryOptions('/index')
        }).type.errors('Expected 2-3 arguments, but got 1.')
      })

      test('requires second argument with query property if query is required', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.String(),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error query property needs to be defined.
          fetch.queryOptions('/index', {})
        }).type.errors(
          "Property 'query' is missing in type '{}' but required in type '{ query: Omit<{ name: string; }, never>; }'.",
        )
      })

      test('requires second argument with query property if query is required', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.String(),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error Query is missing name.
          fetch.queryOptions('/index', { query: {} })
        }).type.errors(
          "Property 'name' is missing in type '{}' but required in type 'Omit<{ name: string; }, never>'.",
        )
      })

      test('requires second argument with valid query property', () => {
        const app = new Elysia().get('/', 'Hello, Elysia', {
          query: t.Object({
            name: t.String(),
          }),
        })

        const fetch = edenFetchTanstackQuery<typeof app>()

        fetch.queryOptions('/index', { query: { name: '' } })
      })
    })

    describe('params', () => {
      test('requires second argument', () => {
        const app = new Elysia().get('/posts/:id', 'POST ID')

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error Needs at least two arguments because the second one has params.
          fetch.queryOptions('/posts/:id')
        }).type.errors('Expected 2-3 arguments, but got 1.')
      })

      test('requires second argument with params property', () => {
        const app = new Elysia().get('/posts/:id', 'POST ID')

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error params property needs to be defined.
          fetch.queryOptions('/posts/:id', {})
        }).type.errors(
          "Property 'params' is missing in type '{}' but required in type '{ params: { id: string; }; }'.",
        )
      })

      test('requires second argument with params property with one required key', () => {
        const app = new Elysia().get('/posts/:id', 'POST ID')

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error The id param needs to be assigned a value.
          fetch.queryOptions('/posts/:id', { params: {} })
        }).type.errors(
          "Property 'id' is missing in type '{}' but required in type '{ id: string; }'.",
        )
      })

      test('requires second argument with params property with one required key assigned to string or number', () => {
        const app = new Elysia().get('/posts/:id', 'POST ID')

        const fetch = edenFetchTanstackQuery<typeof app>()

        attest(() => {
          // @ts-expect-error Boolean is not string.
          fetch.queryOptions('/posts/:id', { params: { id: false } })
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")

        attest(() => {
          // @ts-expect-error null is not string.
          fetch.queryOptions('/posts/:id', { params: { id: null } })
        }).type.errors("Type 'null' is not assignable to type 'string'.")

        attest(() => {
          // @ts-expect-error undefined is not string.
          fetch.queryOptions('/posts/:id', { params: { id: undefined } })
        }).type.errors("Type 'undefined' is not assignable to type 'string'.")

        attest(() => {
          // @ts-expect-error object is not string.
          fetch.queryOptions('/posts/:id', { params: { id: {} } })
        }).type.errors("Type '{}' is not assignable to type 'string'.")

        attest(() => {
          // @ts-expect-error number is not string.
          // NOTE: Elysia.js describes params as strings, but Eden will allow numbers.
          fetch.queryOptions('/posts/:id', { params: { id: 123 } })
        }).type.errors("Type 'number' is not assignable to type 'string'.")

        fetch('/posts/:id', { params: { id: '123' } })
      })

      test('works with formatted separator', () => {
        const app = new Elysia().get('/posts/:id', 'POST ID')

        const fetch = edenFetchTanstackQuery<typeof app>().types({ separator: '$$param$$' })

        fetch.queryOptions('/posts/$$id$$', { params: { id: '' } })
      })
    })
  })
})
