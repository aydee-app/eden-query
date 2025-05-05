import { mobius } from '$lib/eden'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const queryOptions = mobius.queryOptions('/api/posts/:id', { params: { id: '1' } })

  await event.locals.queryClient.prefetchQuery(queryOptions)
}
