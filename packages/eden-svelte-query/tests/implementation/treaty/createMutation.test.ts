import { EdenClient, httpLink } from '@ap0nia/eden'
import { QueryClient } from '@tanstack/svelte-query'
import { get, writable } from 'svelte/store'
import { describe, expect, test } from 'vitest'

import { eden } from '../../eden'

describe('createMutation', () => {
  test('substitutes object path params', async () => {
    const queryClient = new QueryClient()

    const client = new EdenClient({
      links: [httpLink()],
    })

    const context = eden.createContext({ queryClient, client })

    const id = 'ID'

    const mutation = eden.posts({ id }).post.createMutation(undefined, context)

    const $mutation = get(mutation)

    // This should be the ID that was submitted.
    const result = await $mutation.mutateAsync({ message: 'Hello' })

    expect(result).toBe(id)
  })

  test('substitutes readable path params', async () => {
    const queryClient = new QueryClient()

    const client = new EdenClient({
      links: [httpLink()],
    })

    const context = eden.createContext({ queryClient, client })

    const id = writable({ id: 'ID' })

    const mutation = eden.posts(id).post.createMutation(undefined, context)

    const $mutation = get(mutation)

    // This should be the ID that was submitted.
    const result = await $mutation.mutateAsync({ message: 'Hello' })

    expect(result).toBe(get(id).id)

    id.set({ id: 'ID2' })

    const result2 = await $mutation.mutateAsync({ message: 'Hello' })

    expect(result2).toBe(get(id).id)
  })
})
