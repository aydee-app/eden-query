import { EdenClient, httpLink } from '@ap0nia/eden'
import { QueryClient } from '@tanstack/svelte-query'
import { get, readable, writable } from 'svelte/store'
import { describe, expect, test, vi } from 'vitest'

import type { EdenCreateMutationResult } from '../../../src/integration/hooks/create-mutation'
import { createEden, eden } from '../../eden'

const queryClient = new QueryClient()

const client = new EdenClient({
  links: [httpLink()],
})

const context = eden.createContext({ queryClient, client })

describe('createMutation', () => {
  describe('hook is called with correct arguments', () => {
    test('option and path params are not readable, resolved arguments are not readable', async () => {
      const id = 'ID'

      const rootHooks = {
        createMutation: vi.fn(),
      }

      const eden = createEden(undefined, rootHooks as any)

      eden.posts({ id }).post.createMutation(undefined)

      const paths = ['posts', ':id', 'post']

      const options = { params: { id } }

      expect(rootHooks.createMutation).toHaveBeenCalledWith(paths, options)
    })

    test('options is not readable, path params is readable, resolved options is readable', async () => {
      const id = 'ID'

      let args: any[] = []

      const rootHooks = {
        createMutation: vi.fn((...createMutationArgs) => (args = createMutationArgs)),
      }

      const eden = createEden(undefined, rootHooks as any)

      eden.posts(readable({ id })).post.createMutation(undefined)

      const paths = ['posts', ':id', 'post']

      expect(rootHooks.createMutation).toHaveBeenCalledWith(
        paths,
        expect.objectContaining({ subscribe: expect.anything() }),
      )

      expect(args[1]).toHaveProperty('subscribe')

      const params = get(args[1])

      expect(params).toStrictEqual({ params: { id } })
    })

    test('options is readable, path params is not readable, resolved options is readable', async () => {
      const id = 'ID'

      let args: any[] = []

      const rootHooks = {
        createMutation: vi.fn((...createMutationArgs) => (args = createMutationArgs)),
      }

      const eden = createEden(undefined, rootHooks as any)

      eden.posts({ id }).post.createMutation(readable(undefined))

      const paths = ['posts', ':id', 'post']

      expect(rootHooks.createMutation).toHaveBeenCalledWith(
        paths,
        expect.objectContaining({ subscribe: expect.anything() }),
      )

      expect(args[1]).toHaveProperty('subscribe')

      const params = get(args[1])

      expect(params).toStrictEqual({ params: { id } })
    })
  })

  describe('path parameters', () => {
    test('substitutes object path params and requests correct URL', async () => {
      const id = 'ID'

      const fetcher = vi.fn(async () => {
        return Response.json('OK')
      })

      const mutation = eden.posts({ id }).post.createMutation({ eden: { fetcher } }, context)

      const $mutation = get(mutation)

      await $mutation.mutateAsync({ message: 'Hello' })

      expect(fetcher).toHaveBeenCalledWith('http://localhost:3001/posts/ID', expect.anything())
    })

    test('substitutes readable path params and requests correct URL', async () => {
      const id = writable({ id: 'ID' })

      const fetcher = vi.fn(async () => {
        return Response.json('OK')
      })

      const mutation = eden.posts(id).post.createMutation({ eden: { fetcher } }, context)

      const $mutation = get(mutation)

      await $mutation.mutateAsync({ message: 'Hello' })

      expect(fetcher).toHaveBeenCalledWith('http://localhost:3001/posts/ID', expect.anything())

      id.set({ id: 'ID2' })

      await $mutation.mutateAsync({ message: 'Hello' })

      expect(fetcher).toHaveBeenCalledWith('http://localhost:3001/posts/ID2', expect.anything())
    })
  })

  describe('mutation options', () => {
    describe('onMutate', () => {
      test('forwards context from onMutate to onSuccess callback', async () => {
        const id = 'ID'

        const body = { message: 'Hello' }

        const mutationContext = 'HI'

        const onSuccess = vi.fn()

        const onMutate = vi.fn((_variables) => {
          return mutationContext
        })

        const mutation = eden.posts({ id }).post.createMutation({ onSuccess, onMutate }, context)

        const $mutation = get(mutation)

        await $mutation.mutateAsync(body)

        expect(onMutate).toHaveBeenCalledWith(expect.objectContaining({ body }))

        expect(onSuccess).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          mutationContext,
        )
      })
    })

    test('calls on success for valid request', async () => {
      const body = { message: 'hello' }

      const onSuccess = vi.fn()

      const mutation = eden.posts({ id: 1 }).post.createMutation({ onSuccess }, context)

      const $mutation = get(mutation)

      await $mutation.mutateAsync(body)

      expect(onSuccess).toHaveBeenCalledOnce()

      expect(onSuccess).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined)
    })

    test('calls on onError for invalid request', async () => {
      const onError = vi.fn()

      // @ts-expect-error Testing invalid route.
      const mutation = eden.posts.invalid.post.createMutation(
        { onError },
        context,
      ) as EdenCreateMutationResult<any, any, {}, any, any>

      const $mutation = get(mutation)

      await expect($mutation.mutateAsync()).rejects.toThrowError()

      expect(onError).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined)
    })
  })
})
