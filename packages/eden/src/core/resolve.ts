import type { TransformerConfig } from './transform'
import type { InternalElysia, TypeConfig } from './types'

export interface EdenTypesConfig<T extends TypeConfig> {
  types?: T
}

export type EdenResolverConfig<
  TElysia extends InternalElysia = InternalElysia,
  TTypeConfig extends TypeConfig = undefined,
> = EdenTypesConfig<TTypeConfig> &
  TransformerConfig<TElysia, TTypeConfig> & {
    fetch?: RequestInit
  }

type HTTPLinkOptions<
  TElysia extends InternalElysia,
  TTypeConfig extends TypeConfig = undefined,
> = Omit<EdenResolverConfig<TElysia, TTypeConfig>, 'types'> & {
  types?: TypeConfig
  hello?: 'world'
}

type Output<T> = T

export function httpLink<
  TElysia extends InternalElysia,
  const TConfig extends HTTPLinkOptions<TElysia, Extract<TConfig['types'], TypeConfig>>,
>(options: TConfig = {} as any): Output<TElysia> {
  return options as any
}

type App = {
  store: {
    eden: {
      transform: {
        transformer: 'yes'
      }
    }
  }
}

export const outputs: Output<App>[] = [
  httpLink({
    // types: true,
    // transformer: 'yes',
    // transformers: ['yes'],
  }),
]
