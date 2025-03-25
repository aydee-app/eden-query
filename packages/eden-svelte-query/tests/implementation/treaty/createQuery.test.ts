import { QueryClient } from '@tanstack/svelte-query'
import { act } from '@testing-library/svelte'
import { get } from 'svelte/store'
import { describe, expect, test, vi } from 'vitest'

import { httpBatchLink } from '../../../src'
import { EDEN_CONTEXT_KEY } from '../../../src/context'
import { eden } from '../../eden'
import { renderHook } from '../../render-hook'

function createContext() {
  const queryClient = new QueryClient()

  const edenContext = eden.createContext({
    client: eden.createClient({
      links: [
        httpBatchLink({
          domain: 'http://localhost:3000',
        }),
      ],
    }),
    queryClient,
  })

  const context = new Map([[EDEN_CONTEXT_KEY, edenContext]])

  return context
}

describe('createQuery', () => {
  test('query is fetched if not interruped', async () => {
    vi.useFakeTimers()

    const context = createContext()

    const duration = 500

    const fetcher = vi.fn<typeof fetch>(async (_url, _init) => {
      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('OK')
    })

    const a = renderHook(
      () =>
        eden.posts.get.createQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
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
      await vi.advanceTimersByTimeAsync(duration / 2 + 1_000)
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

    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const a = renderHook(
      () =>
        eden.posts.get.createQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
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

    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const a = renderHook(
      () =>
        eden.posts.get.createQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
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
