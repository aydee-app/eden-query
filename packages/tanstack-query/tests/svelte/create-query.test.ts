import { createQuery, QueryClient } from '@tanstack/svelte-query'
import { act } from '@testing-library/svelte'
import Elysia from 'elysia'
import { get } from 'svelte/store'
import { describe, expect, test, vi } from 'vitest'

import { edenTreatyTanstackQuery } from '../../src/treaty'
import { useApp } from '../setup'
import { renderHook } from './render-hook'

/**
 * @see https://github.com/TanStack/query/blob/5f65345a4d0d06c7cd019c0928df15f1344807c6/packages/svelte-query/src/context.ts#L6
 */
const SVELTE_QUERY_CONTEXT_KEY = '$$_queryClient'

function createContext() {
  const queryClient = new QueryClient()

  const context = new Map([[SVELTE_QUERY_CONTEXT_KEY, queryClient]])

  return context
}

describe('createQuery', () => {
  test('query is fetched if not interruped', async () => {
    vi.useFakeTimers()

    const duration = 500

    const fetcher = vi.fn(async (_url, _init) => {
      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('OK')
    })

    const data = ['A', 'B', 'C']

    const app = new Elysia().get('/hello/world', async () => {
      await new Promise((resolve) => setTimeout(resolve, duration))
      return data
    })

    useApp(app)

    const context = createContext()

    const a = renderHook(
      () => {
        const eden = edenTreatyTanstackQuery<typeof app>()

        const query = createQuery(eden.hello.world.get.queryOptions(undefined, { fetcher }))

        return query
      },
      { context },
    )

    const subscriber = vi.fn()

    // It needs at least one subscriber in order to update itself.
    a.result.subscribe(subscriber)

    // Advance time by an insufficient amount to finish the request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(subscriber).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFetched: false,
      }),
    )

    expect(get(a.result).isFetched).toBeFalsy()

    // Advance time enough to definitely handle the request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration)
    })

    expect(get(a.result).isFetched).toBeTruthy()

    expect(subscriber).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isFetched: true,
      }),
    )

    vi.useRealTimers()
  })

  test('query is aborted if unmounted early', async () => {
    vi.useFakeTimers()

    const context = createContext()

    const abortListener = vi.fn()

    const duration = 500

    const fetcher = vi.fn(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const data = ['A', 'B', 'C']

    const _app = new Elysia().get('/hello/world', async () => {
      await new Promise((resolve) => setTimeout(resolve, duration))
      return data
    })

    const a = renderHook(
      () => {
        const eden = edenTreatyTanstackQuery<typeof _app>(undefined, { abortOnUnmount: true })

        const query = createQuery(eden.hello.world.get.queryOptions(undefined, { fetcher }))

        return query
      },
      { context },
    )

    const subscriber = vi.fn()

    // It needs at least one subscriber in order to update itself.
    const unsubscribe = a.result.subscribe(subscriber)

    // Advance time by an insufficient amount to finish the request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(get(a.result).isFetched).toBeFalsy()

    // When a component unmounts, it unsubscribes. Since we subscribed outside the component,
    // we have to simulate this behavior.
    unsubscribe()
    a.unmount()

    expect(abortListener).toHaveBeenCalledOnce()

    vi.useRealTimers()

    unsubscribe()
  })

  test('query is not aborted if not unmounted early', async () => {
    vi.useFakeTimers()

    const context = createContext()

    const abortListener = vi.fn()

    const duration = 500

    const fetcher = vi.fn(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const data = ['A', 'B', 'C']

    const _app = new Elysia().get('/hello/world', async () => {
      await new Promise((resolve) => setTimeout(resolve, duration))
      return data
    })

    const a = renderHook(
      () => {
        const eden = edenTreatyTanstackQuery<typeof _app>(undefined, { abortOnUnmount: true })

        const query = createQuery(eden.hello.world.get.queryOptions(undefined, { fetcher }))

        return query
      },
      { context },
    )

    const subscriber = vi.fn()

    // It needs at least one subscriber in order to update itself.
    const unsubscribe = a.result.subscribe(subscriber)

    // Advance time by an insufficient amount to finish the request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(get(a.result).isFetched).toBeFalsy()

    expect(abortListener).not.toHaveBeenCalledOnce()

    unsubscribe()

    vi.useRealTimers()
  })
})
