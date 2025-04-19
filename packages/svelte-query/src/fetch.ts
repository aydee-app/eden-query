import {
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
  type Split,
  type UnionToIntersection,
} from '@ap0nia/eden'
import { edenFetchTanstackQuery } from '@ap0nia/eden-tanstack-query'
import {
  createInfiniteQuery,
  type CreateInfiniteQueryOptions,
  type CreateInfiniteQueryResult,
  createMutation,
  type CreateMutationOptions,
  type CreateMutationResult,
  createQuery,
  type CreateQueryOptions,
  type CreateQueryResult,
  type InfiniteData,
} from '@tanstack/svelte-query'

import type { EdenSvelteQueryConfig } from './types'

export type EdenFetchSvelteQueryHooks<
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
  TInfiniteEndpoints = {
    [K in keyof TEndpoints as TEndpoints[K] extends InfiniteQueryRoute
      ? { cursor?: any } extends TEndpoints[K]['get']['query']
        ? K
        : never
      : never]: TEndpoints[K]
  },
> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(types?: U): EdenFetchSvelteQuery<TElysia, U>

  createQuery: /**
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
            config?: Partial<
              CreateQueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [Split<TEndpoint>, { options: ExtendedEdenRouteOptions; type: 'query' }]
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]
        : [
            options: EdenFetchOptions<TMethod, TRoute>,
            config?: Partial<
              CreateQueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [Split<TEndpoint>, { options: ExtendedEdenRouteOptions; type: 'query' }]
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]),
    ]
  ) => CreateQueryResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>

  createInfiniteQuery: /**
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
    TPath extends keyof TInfiniteEndpoints,
    TEndpoint extends TInfiniteEndpoints[TPath],
    TMethod extends Uppercase<keyof TEndpoint & string> | undefined,
    TRoute extends InternalRouteSchema = Extract<
      TEndpoint[Extract<
        undefined extends TMethod ? 'GET' | 'get' : TMethod | Lowercase<TMethod & string>,
        keyof TEndpoint
      >],
      InternalRouteSchema
    >,
  >(
    path: TPath,
    options: EdenFetchOptions<TMethod, TRoute>,
    config: Omit<
      CreateInfiniteQueryOptions<
        EdenRouteSuccess<TRoute>,
        EdenRouteError<TRoute>,
        EdenRouteSuccess<TRoute>,
        [Split<TEndpoint>, { options: ExtendedEdenRouteOptions; type: 'query' }]
      >,
      'queryKey'
    > & {
      eden?: EdenResolverConfig<TElysia, TConfig>
    },
  ) => CreateInfiniteQueryResult<InfiniteData<EdenRouteSuccess<TRoute>>, EdenRouteError<TRoute>>

  createMutation: /**
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
            config?: Partial<
              CreateMutationOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                TBody,
                TContext
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]
        : [
            options: EdenFetchOptions<TMethod, TRoute>,
            config?: Partial<
              CreateMutationOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                TBody,
                TContext
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]),
    ]
  ) => CreateMutationResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
}
/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenFetchSvelteQuery<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = { separator: ':param' },
  TEndpoints = EdenFetchEndpoints<TElysia, TElysia['_routes'], TConfig>,
> = EdenFetchSvelteQueryHooks<TElysia, TConfig, TEndpoints> &
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

export function edenFetchSvelteQuery<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = { separator: ':param' },
>(
  domain?: string,
  config: EdenSvelteQueryConfig<TElysia, TConfig> = {},
): EdenFetchSvelteQuery<TElysia, TConfig> {
  const tanstack = edenFetchTanstackQuery(domain, config)

  const hooks: EdenFetchSvelteQueryHooks<TElysia, TConfig> = {
    types: (types) => {
      return edenFetchSvelteQuery(domain, { ...config, types } as any) as any
    },
    createQuery: (path, ...args) => {
      const argArray: any[] = args

      const { eden, ...userOptions } = (argArray[1] ?? {}) as any

      const baseQueryOptions = tanstack.queryOptions(path, argArray[0], eden)

      const queryOptions = { ...baseQueryOptions, ...userOptions }

      const query = createQuery(queryOptions)

      return query as any
    },
    createInfiniteQuery: (path, ...args) => {
      const argArray: any[] = args

      const { eden, ...userOptions } = (argArray[1] ?? {}) as any

      const baseQueryOptions = tanstack.queryOptions(path, argArray[0], eden)

      const infiniteQueryOptions = { ...baseQueryOptions, ...userOptions }

      const infiniteQuery = createInfiniteQuery(infiniteQueryOptions)

      return infiniteQuery as any
    },
    createMutation: (path, ...args) => {
      const argArray: any[] = args

      const { eden, ...userOptions } = (argArray[1] ?? {}) as any

      const baseMutationOptions = tanstack.mutationOptions(path, argArray[0], eden)

      const mutationOptions = { ...baseMutationOptions, ...userOptions }

      const mutation = createMutation(mutationOptions)

      return mutation as any
    },
  }

  const proxy: any = new Proxy(tanstack as any, {
    get(_target, p, _receiver) {
      return hooks[p as never]
    },
    apply(target, _thisArg, argArray) {
      return target(...argArray)
    },
  })

  return proxy
}

/**
 * @example
 *
 * ```ts
 * type routes = {
 *   "/hello": {
 *     "get": {
 *       response: {
 *         200: "Hello"
 *       }
 *     }
 *   },
 *   "/infinite": {
 *     get: {
 *       query: {
 *         cursor?: any
 *       },
 *       response: {
 *         200: "Hello"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export type InfiniteQueryRoute = {
  get: {
    query: Partial<Record<InfiniteQueryKeys, any>>
  }
}

export type InfiniteQueryKeys = 'cursor' | 'direction'
