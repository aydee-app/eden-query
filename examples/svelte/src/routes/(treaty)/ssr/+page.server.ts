import { eden } from '$lib/eden'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  const queryOptions = eden.api.posts({ id: '1' }).get.queryOptions()

  await event.locals.queryClient.prefetchQuery(queryOptions)
}
