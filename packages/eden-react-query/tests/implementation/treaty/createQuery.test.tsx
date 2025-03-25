import { act, render, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { App, wrapper } from '../../app-provider'
import { eden } from '../../eden'

function DoSomething() {
  const query = eden.posts.get.useQuery()

  return (
    <div>
      <p>Data:</p>
      <div>{JSON.stringify(query.data)}</div>
    </div>
  )
}

describe('createQuery', () => {
  test('it works', async () => {
    const result = render(
      <App>
        <DoSomething />
      </App>,
    )

    await waitFor(() => expect(result.getByText(JSON.stringify(['A', 'B', 'C']))).toBeTruthy())
  })

  test('query is fetched if not interruped', async () => {
    vi.useFakeTimers()

    const duration = 500

    const fetcher = vi.fn<typeof fetch>(async (_url, _init) => {
      await new Promise((resolve) => setTimeout(resolve, duration))
      return new Response('OK')
    })

    const a = renderHook(
      () =>
        eden.posts.get.useQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
      { wrapper },
    )

    // Advance time by an insufficient amount to finish the request.
    await act(() => {
      vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(a.result.current.isFetched).toBeFalsy()

    // Advance time enough to definitely handle the request.
    await act(() => {
      vi.advanceTimersByTimeAsync(duration / 2 + 1_000)
    })

    await waitFor(() => expect(a.result.current.isFetched).toBeTruthy())

    vi.useRealTimers()
  })

  test('query is aborted if unmounted early', async () => {
    vi.useFakeTimers()

    const abortListener = vi.fn()

    const duration = 500

    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const a = renderHook(
      () =>
        eden.posts.get.useQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
      { wrapper },
    )

    // Advance time by an insufficient amount to finish the request.
    await act(() => {
      vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(a.result.current.isFetched).toBeFalsy()

    a.unmount()

    expect(abortListener).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })

  test('query is not aborted if not unmounted early', async () => {
    vi.useFakeTimers()

    const abortListener = vi.fn()

    const duration = 500

    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      init?.signal?.addEventListener('abort', abortListener)

      await new Promise((resolve) => setTimeout(resolve, duration))

      return new Response('YES')
    })

    const a = renderHook(
      () =>
        eden.posts.get.useQuery(undefined, {
          eden: {
            fetcher,
          },
        }),
      { wrapper },
    )

    // Advance time by an insufficient amount to finish the request.
    await act(() => {
      vi.advanceTimersByTimeAsync(duration / 2)
    })

    expect(a.result.current.isFetched).toBeFalsy()

    expect(abortListener).not.toHaveBeenCalledOnce()

    vi.useRealTimers()
  })
})
