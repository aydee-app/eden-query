import type { EdenTreatyInferInput, EdenTreatyInferOutput } from '@ap0nia/eden'
import { edenTreatyTanstackQuery } from '@ap0nia/eden-tanstack-query'

import type { App } from '../server'

export const eden = edenTreatyTanstackQuery<App>(undefined, {
  abortOnUnmount: true,
})

export type InferInput = EdenTreatyInferInput<App>

export type InferOutput = EdenTreatyInferOutput<App>
