import { Elysia, t } from 'elysia'
import { describe, test } from 'vitest'

import { edenTreatyTanstackQuery } from '../src/treaty'
import { useApp } from './setup'

describe('edenTreatyTanstackQuery', () => {
  test('it works', async () => {
    const app = new Elysia().get('/posts/:id', () => 'Hello' as const)

    useApp(app)

    type App = typeof app

    const eden = edenTreatyTanstackQuery<App>('http://localhost:3000')

    const queryOptions = eden.posts({ id: 123 }).get.queryOptions({ params: { hello: 123 } })

    const result = await queryOptions.queryFn({} as any)

    console.log({ result, queryOptions })
  })

  test.skip('types work', async () => {
    const { injectQuery, injectMutation, injectInfiniteQuery } = await import(
      '@tanstack/angular-query-experimental'
    )

    const {
      useInfiniteQuery: useReactInfiniteQuery,
      useMutation: useReactMutation,
      useQuery: useReactQuery,
    } = await import('@tanstack/react-query')

    const { useMutation, useQuery, useInfiniteQuery } = await import('@tanstack/solid-query')

    const { createMutation, createQuery, createInfiniteQuery } = await import(
      '@tanstack/svelte-query'
    )

    const {
      useMutation: useVueMutation,
      useQuery: useVueQuery,
      useInfiniteQuery: useVueInfiniteQuery,
    } = await import('@tanstack/vue-query')

    const app = new Elysia()
      .get('/users', () => 'INFINITE' as const, {
        query: t.Object({
          cursor: t.Optional(t.Number()),
        }),
      })
      .get('/posts/:id', () => 'Hello' as const)
      .patch('/posts/:id', () => 'Bye' as const)
      .ws('/posts/:id', {})

    useApp(app)

    type App = typeof app

    const eden = edenTreatyTanstackQuery<App>('http://localhost:3000')

    const subscription = eden.posts({ id: 789 }).subscribe()
    console.log(subscription)

    const queryOptions = eden.posts({ id: 123 }).get.queryOptions({ params: { hello: 123 } })
    const mutationOptions = eden.posts({ id: 456 }).patch.mutationOptions()
    const infiniteQueryOptions = eden.users.get.queryOptions({ query: {} })

    const reactQuery = useReactQuery(queryOptions)
    const reactMutation = useReactMutation(mutationOptions)
    const reactInfiniteQuery = useReactInfiniteQuery({
      ...infiniteQueryOptions,
      initialPageParam: 0,
      getNextPageParam: () => 1,
    })

    console.log(reactQuery, reactMutation, reactInfiniteQuery)

    const svelteQuery = createQuery(queryOptions)
    const svelteMutation = createMutation(mutationOptions)
    const svelteInfiniteQuery = createInfiniteQuery({
      ...infiniteQueryOptions,
      initialPageParam: 0,
      getNextPageParam: () => 1,
    })

    console.log(svelteQuery, svelteMutation, svelteInfiniteQuery)

    const vueQuery = useVueQuery(queryOptions)
    const vueMutation = useVueMutation(mutationOptions)
    const vueInfiniteQuery = useVueInfiniteQuery({
      ...infiniteQueryOptions,
      initialPageParam: 0,
      getNextPageParam: () => 1,
    })

    console.log(vueQuery, vueMutation, vueInfiniteQuery)

    const solidQuery = useQuery(() => queryOptions)
    const solidMutation = useMutation(() => mutationOptions)
    const solidInfiniteQuery = useInfiniteQuery(() => ({
      ...infiniteQueryOptions,
      initialPageParam: 0,
      getNextPageParam: () => 1,
    }))

    console.log(solidQuery, solidMutation, solidInfiniteQuery)

    const angularQuery = injectQuery(() => queryOptions)
    const angularMutation = injectMutation(() => mutationOptions)
    const angularInfiniteQuery = injectInfiniteQuery(() => ({
      ...infiniteQueryOptions,
      initialPageParam: 0,
      getNextPageParam: () => 1,
    }))

    console.log(angularQuery, angularMutation, angularInfiniteQuery)
  })
})
