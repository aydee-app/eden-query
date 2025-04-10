/** @jsxImportSource solid-js */

import { httpBatchLink } from '@ap0nia/eden'
import { batchPlugin, transformPlugin } from '@ap0nia/eden/plugins'
import { render, screen, waitFor } from '@solidjs/testing-library'
import { useQuery } from '@tanstack/solid-query'
import Elysia from 'elysia'
import SuperJSON from 'superjson'
import { describe, expect, test } from 'vitest'

import { edenTreatyTanstackQuery } from '../../src/treaty'
import { useApp } from '../setup'
import { wrapper } from './wrapper'

describe('useQuery', () => {
  test('basic example works', async () => {
    const data = 'Hello, Elysia' as const

    const app = new Elysia().get('/', () => data)

    useApp(app)

    function Component() {
      const eden = edenTreatyTanstackQuery<typeof app>()

      const query = useQuery(eden.index.get.queryOptions)

      return <p>{query.data}</p>
    }

    render(() => <Component />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(data)).toBeInTheDocument()
    })
  })

  test('path parameters works', async () => {
    const id = 'Hello,Elysia' as const

    const app = new Elysia()
      .get('/posts/:id', (context) => context.params.id)
      .get('/hello/world/here', () => {})

    useApp(app)

    function Component() {
      const eden = edenTreatyTanstackQuery<typeof app>()

      const query = useQuery(eden.posts({ id }).get.queryOptions)

      return <p>{query.data}</p>
    }

    render(() => <Component />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(id)).toBeInTheDocument()
    })
  })

  test('custom path parameter separator works', async () => {
    const id = 'Hello,Elysia' as const

    const app = new Elysia().get('/posts/:id', (context) => context.params.id)

    useApp(app)

    function Component() {
      const eden = edenTreatyTanstackQuery<typeof app>().types({ separator: '$$__$$param$$__$$' })

      const query = useQuery(() => eden.posts.$$__$$id$$__$$.get.queryOptions({ params: { id } }))

      return <p>{query.data}</p>
    }

    render(() => <Component />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(id)).toBeInTheDocument()
    })
  })

  test('batch link works', async () => {
    const data1 = 'Hello'
    const data2 = 'World'

    const app = new Elysia()
      .use(batchPlugin({ types: true }))
      .get('/hello', () => data1)
      .get('/world', () => data2)

    useApp(app)

    function Component() {
      const eden = edenTreatyTanstackQuery<typeof app>(undefined, {
        links: [
          httpBatchLink({
            types: true,
          }),
        ],
      })

      const query1 = useQuery(eden.hello.get.queryOptions)
      const query2 = useQuery(eden.world.get.queryOptions)

      return (
        <div>
          <p>{query1.data}</p>
          <p>{query2.data}</p>
        </div>
      )
    }

    render(() => <Component />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(data1)).toBeInTheDocument()
      expect(screen.getByText(data2)).toBeInTheDocument()
    })
  })

  test('batch link with transformer works', async () => {
    const data1 = 123n
    const data2 = 345n

    const app = new Elysia()
      .use(transformPlugin({ types: true, transformer: SuperJSON }))
      .use(batchPlugin({ types: true }))
      .get('/hello', () => data1)
      .get('/world', () => data2)

    useApp(app)

    function Component() {
      const eden = edenTreatyTanstackQuery<typeof app>(undefined, {
        links: [
          httpBatchLink({
            types: true,
            transformer: SuperJSON,
          }),
        ],
      })

      const query1 = useQuery(eden.hello.get.queryOptions)
      const query2 = useQuery(eden.world.get.queryOptions)

      return (
        <div>
          <p>{query1.data?.toString()}</p>
          <p>{query2.data?.toString()}</p>
        </div>
      )
    }

    render(() => <Component />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(data1.toString())).toBeInTheDocument()
      expect(screen.getByText(data2.toString())).toBeInTheDocument()
    })
  })
})
