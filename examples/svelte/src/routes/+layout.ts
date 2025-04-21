import { EdenClient, httpBatchSubscriptionLink } from '@ap0nia/eden'
import { QueryClient } from '@tanstack/svelte-query'
import SuperJSON from 'superjson'

import { browser } from '$app/environment'

import type { App } from '../server'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async (event) => {
  /**
   * Generate a new query client for each user's request.
   *
   * When prefetching queries in load functions, this QueryClient's cache
   * will be populated and merged in the application's root layout.
   */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        refetchOnMount: false,
      },
    },
  })

  const client = new EdenClient<App>({
    links: [
      httpBatchSubscriptionLink({
        types: true,
        endpoint: '/api/batch',
        transformer: SuperJSON,
        fetcher: event.fetch,
      }),
    ],
  })

  const dehydrated = event.data.dehydrated

  return { client, queryClient, dehydrated }
}
