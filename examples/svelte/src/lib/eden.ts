import type { EdenTreatyInferInput, EdenTreatyInferOutput } from '@ap0nia/eden'
import { edenTreatySvelteQuery } from '@ap0nia/eden-svelte-query'
import { edenFetchSvelteQuery } from '@ap0nia/eden-svelte-query/src/fetch'
import { edenFetchTanstackQuery, edenTreatyTanstackQuery } from '@ap0nia/eden-tanstack-query'

import type { App } from '../server'

/**
 * Eden-Treaty + Tanstack-Query.
 */
export const eden = edenTreatyTanstackQuery<App>(undefined, {
  abortOnUnmount: true,
})

/**
 * Eden-Treaty + Svelte-Query.
 */
export const aponia = edenTreatySvelteQuery<App>(undefined, {
  abortOnUnmount: true,
})

/**
 * Eden-Fetch + Tanstack-Query.
 */
export const mobius = edenFetchTanstackQuery<App>(undefined, {
  abortOnUnmount: true,
})

/**
 * Eden-Fetch + Svelte-Query.
 */
export const hua = edenFetchSvelteQuery<App>(undefined, {
  abortOnUnmount: true,
})

export type InferInput = EdenTreatyInferInput<App>

export type InferOutput = EdenTreatyInferOutput<App>
