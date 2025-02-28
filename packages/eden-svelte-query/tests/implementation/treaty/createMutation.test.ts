import { EdenClient, httpLink } from '@ap0nia/eden'
import { QueryClient } from '@tanstack/svelte-query'
import { get } from 'svelte/store'
import { describe, expect,test } from 'vitest'

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
})
