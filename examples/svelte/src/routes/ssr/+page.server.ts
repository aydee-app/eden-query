import { dehydrate } from '@tanstack/svelte-query'

import { eden } from '$lib/eden'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  console.log(event.locals.queryClient)

  console.log(event.locals.dehydrated)

  await event.locals.queryClient.fetchQuery(eden.api.bye.get.queryOptions())

  const newDehydrated = dehydrate(event.locals.queryClient)

  event.locals.dehydrated.queries.push(...newDehydrated.queries)
  event.locals.dehydrated.mutations.push(...newDehydrated.mutations)
}
