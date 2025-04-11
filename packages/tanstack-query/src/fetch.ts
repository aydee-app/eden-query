import {
  edenFetch,
  type EdenFetchOptions,
  type EdenFetchRequester,
  type EdenResolverConfig,
  type EdenRouteBody,
  type EdenRouteError,
  type EdenRouteSuccess,
  type ExtendedEdenRouteOptions,
  type FormatParam,
  type InternalEdenTypesConfig,
  type InternalElysia,
  type InternalRouteSchema,
  type IsAny,
  type Join,
  linkAbortSignals,
  type Split,
  type UnionToIntersection,
} from '@ap0nia/eden'
import type { MutationOptions } from '@tanstack/query-core'

import type { EdenMutationOptions, EdenQueryOptions, EdenTanstackQueryConfig } from './treaty'

export type EdenFetchTanstackQueryHooks<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = { separator: ':param' },
  TEndpoints = EdenFetchEndpoints<TElysia, TElysia['_routes'], TConfig>,
  TQueryEndpoints = {
    [K in keyof TEndpoints as 'get' extends keyof TEndpoints[K] ? K : never]: TEndpoints[K]
  },
  TMutationEndpoints = {
    [K in keyof TEndpoints as 'get' | 'subscribe' extends keyof TEndpoints[K]
      ? never
      : K]: TEndpoints[K]
  },
> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(types?: U): EdenFetchTanstackQuery<TElysia, U>

  queryOptions: /**
   * @template TMethod The uppercase HTTP method.
   *   IMPORTANT: will not work with mixed-case custom methods.
   *   Eden-Fetch will attempt to find a matching route with either the fully uppercase or lowercase HTTP method.
   *
   *   @see https://elysiajs.com/essential/route.html#custom-method
   *
   *   BAD - mixed-case: app.route('M-search', '/m-search', 'connect')
   *   OK - uppercase: app.route('M-SEARCH', '/m-search', 'connect')
   *   OK - lowercase: app.route('m-search', '/m-search', 'connect')
   */
  <
    TPath extends keyof TQueryEndpoints,
    TEndpoint extends TQueryEndpoints[TPath],
    TMethod extends Uppercase<keyof TEndpoint & string> | undefined,
    TRoute extends InternalRouteSchema = Extract<
      TEndpoint[Extract<
        undefined extends TMethod ? 'GET' | 'get' : TMethod | Lowercase<TMethod & string>,
        keyof TEndpoint
      >],
      InternalRouteSchema
    >,
    TOptions = EdenFetchOptions<TMethod, TRoute>,
  >(
    path: TPath,
    ...args: [
      ...({} extends TOptions
        ? [
            options?: EdenFetchOptions<TMethod, TRoute>,
            config?: EdenResolverConfig<TElysia, TConfig>,
          ]
        : [
            options: EdenFetchOptions<TMethod, TRoute>,
            config?: EdenResolverConfig<TElysia, TConfig>,
          ]),
    ]
  ) => EdenQueryOptions<
    EdenRouteSuccess<TRoute>,
    EdenRouteError<TRoute>,
    EdenRouteSuccess<TRoute>,
    [Split<TEndpoint>, { options: ExtendedEdenRouteOptions; type: 'query' }],
    TOptions extends { query: { cursor?: any } } ? TOptions['query']['cursor'] : never
  >

  mutationOptions: /**
   * @template TMethod The uppercase HTTP method.
   *   IMPORTANT: will not work with mixed-case custom methods.
   *   Eden-Fetch will attempt to find a matching route with either the fully uppercase or lowercase HTTP method.
   *
   *   @see https://elysiajs.com/essential/route.html#custom-method
   *
   *   BAD - mixed-case: app.route('M-search', '/m-search', 'connect')
   *   OK - uppercase: app.route('M-SEARCH', '/m-search', 'connect')
   *   OK - lowercase: app.route('m-search', '/m-search', 'connect')
   */
  <
    TContext,
    TPath extends keyof TMutationEndpoints,
    TEndpoint extends TMutationEndpoints[TPath],
    TMethod extends Uppercase<keyof TEndpoint & string> | undefined,
    TRoute extends InternalRouteSchema = Extract<
      TEndpoint[Extract<
        undefined extends TMethod ? 'GET' | 'get' : TMethod | Lowercase<TMethod & string>,
        keyof TEndpoint
      >],
      InternalRouteSchema
    >,
    TOptions = EdenFetchOptions<TMethod, TRoute>,
    TBody = EdenRouteBody<TRoute>,
  >(
    path: TPath,
    ...args: [
      ...({} extends TOptions
        ? [
            options?: EdenFetchOptions<TMethod, TRoute>,
            mutationOptions?: MutationOptions<
              EdenRouteSuccess<TRoute>,
              EdenRouteError<TRoute>,
              TBody,
              TContext
            >,
          ]
        : [
            options: EdenFetchOptions<TMethod, TRoute>,
            mutationOptions?: MutationOptions<
              EdenRouteSuccess<TRoute>,
              EdenRouteError<TRoute>,
              TBody,
              TContext
            >,
          ]),
    ]
  ) => EdenMutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
}
/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenFetchTanstackQuery<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = { separator: ':param' },
  TEndpoints = EdenFetchEndpoints<TElysia, TElysia['_routes'], TConfig>,
> = EdenFetchTanstackQueryHooks<TElysia, TConfig, TEndpoints> &
  EdenFetchRequester<TElysia, TElysia['_routes'], TConfig, TEndpoints>

export type EdenFetchEndpoints<
  TElysia extends InternalElysia,
  TRoutes,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> =
  IsAny<TRoutes> extends true
    ? {}
    : UnionToIntersection<EdenFetchDistinctEndpoints<TElysia, TRoutes, TConfig, TPaths>>

export type EdenFetchDistinctEndpoints<
  TElysia extends InternalElysia,
  TRoutes,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? Record<Join<TPaths>, Record<K, TRoutes[K]>>
    : EdenFetchEndpoints<
        TElysia,
        TRoutes[K],
        TConfig,
        [...TPaths, K extends `:${string}` ? FormatParam<K, TConfig['separator']> : K]
      >
}[keyof TRoutes]

export function edenFetchTanstackQuery<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenTanstackQueryConfig<TElysia, TConfig> = {},
): EdenFetchTanstackQueryHooks<TElysia, TConfig> {
  const fetch = edenFetch(domain, config)

  const hooks: EdenFetchTanstackQueryHooks<TElysia, TConfig> = {
    types: (types) => {
      return edenFetchTanstackQuery(domain, { ...config, types } as any) as any
    },
    queryOptions: (...args) => {
      const path = args[0] as string

      const paths = path.split('/').filter((p) => p !== 'index')

      const queryKey = [paths, { options: args[1], type: 'query' }]

      const queryOptions: EdenQueryOptions = {
        queryKey,
        queryFn: async (context) => {
          const resolvedArgs: any[] = [...args]

          if (config.forwardSignal) {
            resolvedArgs[2] = { ...resolvedArgs[2], fetch: resolvedArgs[2]?.fetch }

            linkAbortSignals(context.signal, resolvedArgs[2].fetch.signal)

            resolvedArgs[2].fetch.signal = context.signal
          }

          const result = await (fetch as any)(...resolvedArgs)
          return result
        },
      }

      return queryOptions as any
    },
    mutationOptions: (...args) => {
      const mutationOptions: EdenMutationOptions = {
        mutationKey: [],
        mutationFn: async (body) => {
          const resolvedArgs: any[] = [...args]

          resolvedArgs[1] = { ...resolvedArgs[1], body }

          const result = await (fetch as any)(...resolvedArgs)

          return result
        },
      }

      return mutationOptions as any
    },
  }

  const proxy: any = new Proxy(fetch as any, {
    get(_target, p, _receiver) {
      return hooks[p as never]
    },
    apply(target, _thisArg, argArray) {
      return target(...argArray)
    },
  })

  return proxy
}
