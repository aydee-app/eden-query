import { InternalEdenTypesConfig, InternalElysia } from '@ap0nia/eden'
import { EdenTanstackQueryConfig } from '@ap0nia/eden-tanstack-query'

export interface EdenSvelteQueryConfig<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> extends EdenTanstackQueryConfig<TElysia, TConfig> {}
