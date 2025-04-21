import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { dehydrate, type NotifyEventType,QueryClient } from '@tanstack/svelte-query'

/**
 * Eden reads 'content-type' header, so this needs to be allowed in order to enable pre-fetching.
 * @see https://github.com/elysiajs/eden/blob/main/src/fetch/index.ts#L53
 */
const contentTypeHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name.startsWith('content-type'),
  })
  return response
}

/**
 * Checks if emitted event is about cache change and not about observers.
 * Useful for persist, where we only want to trigger save when cache is changed.
 */
const cacheEventTypes: Array<NotifyEventType> = ['added', 'removed', 'updated']

/**
 * Initialize dehydrated state that can be mutated during SSR.
 *
 * The root layout will merge the dehydrated state.
 */
const handleDehydratedQueryClient: Handle = async ({ event, resolve }) => {
  const queryClient = new QueryClient()

  const dehydrated = dehydrate(queryClient)

  event.locals.queryClient = queryClient
  event.locals.dehydrated = dehydrated

  /**
   * @see https://github.com/TanStack/query/blob/b63a1d08f9fa9c59b8d3440d4664f4e66ddd9d35/packages/query-persist-client-core/src/persist.ts#L133
   */
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!cacheEventTypes.includes(event.type)) return

    const newDehydrated = dehydrate(queryClient)

    dehydrated.queries.push(...newDehydrated.queries)
    dehydrated.mutations.push(...newDehydrated.mutations)
  })

  const response = await resolve(event)

  unsubscribe()

  return response
}

export const handle = sequence(contentTypeHandle, handleDehydratedQueryClient)
