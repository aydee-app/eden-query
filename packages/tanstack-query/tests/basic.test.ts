import { useMutation as useReactMutation, useQuery as useReactQuery } from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/solid-query'
import { createMutation, createQuery } from '@tanstack/svelte-query'
import { useMutation as useVueMutation, useQuery as useVueQuery } from '@tanstack/vue-query'
import { Elysia } from 'elysia'
import { describe, test } from 'vitest'

import { edenTanstackQuery } from '../src/treaty'
import { useApp } from './setup'

describe('edenTreatyTanstackQuery', () => {
  test('it works', async () => {
    const app = new Elysia().get('/posts/:id', () => 'Hello' as const)

    useApp(app)

    type App = typeof app

    const eden = edenTanstackQuery<App>('http://localhost:3000')

    const queryOptions = eden.posts({ id: 123 }).get({ params: { hello: 123 } })

    const result = await queryOptions.queryFn()

    console.log(result)
  })

  test.skip('types work', () => {
    const app = new Elysia()
      .get('/posts/:id', () => 'Hello' as const)
      .patch('/posts/:id', () => 'Bye' as const)
      .ws('/posts/:id', {})

    useApp(app)

    type App = typeof app

    const eden = edenTanstackQuery<App>('http://localhost:3000')

    const queryOptions = eden.posts({ id: 123 }).get({ params: { hello: 123 } })
    const mutationOptions = eden.posts({ id: 456 }).patch()
    const subscription = eden.posts({ id: 789 }).subscribe()

    const reactQuery = useReactQuery(queryOptions)
    const reactMutation = useReactMutation(mutationOptions)

    console.log(reactQuery, reactMutation)

    const svelteQuery = createQuery(queryOptions)
    const svelteMutation = createMutation(mutationOptions)

    console.log(svelteQuery, svelteMutation)

    const vueQuery = useVueQuery(queryOptions)
    const vueMutation = useVueMutation(mutationOptions)

    console.log(vueQuery, vueMutation)

    const solidQuery = useQuery(() => queryOptions)
    const solidMutation = useMutation(() => mutationOptions)

    console.log(solidQuery, solidMutation)

    console.log(subscription)
  })
})
