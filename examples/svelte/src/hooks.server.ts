import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { dehydrate, QueryClient } from '@tanstack/svelte-query'

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
 * Initialize dehydrated state that can be mutated during SSR.
 *
 * The root layout will merge the dehydrated state.
 */
const initializeDehydratedState: Handle = async ({ event, resolve }) => {
  const queryClient = new QueryClient()
  event.locals.queryClient = queryClient
  event.locals.dehydrated = dehydrate(queryClient)
  return await resolve(event)
}

export const handle = sequence(contentTypeHandle, initializeDehydratedState)
