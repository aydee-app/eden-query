import type { InternalEdenTypesConfig, InternalElysia } from '@ap0nia/eden'
import type { EdenTanstackQueryConfig } from '@ap0nia/eden-tanstack-query'

export interface EdenSvelteQueryConfig<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> extends EdenTanstackQueryConfig<TElysia, TConfig> {}
