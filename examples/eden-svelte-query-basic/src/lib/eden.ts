import {
  createEdenTreatySvelteQuery,
  type InferTreatyQueryInput,
  type InferTreatyQueryOutput,
} from '@aydee-app/eden-svelte-query'

import type { App } from '../server'

export const eden = createEdenTreatySvelteQuery<App>({
  abortOnUnmount: true,
})

export type InferInput = InferTreatyQueryInput<App>

export type InferOutput = InferTreatyQueryOutput<App>
