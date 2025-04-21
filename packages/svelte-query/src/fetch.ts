import {
  type EdenFetch,
  type EdenFetchOptions,
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
import {
  type EdenFetchTanstackQuery,
  edenFetchTanstackQuery,
  type QueryMethod,
} from '@ap0nia/eden-tanstack-query'
import {
  createInfiniteQuery,
  type CreateInfiniteQueryOptions,
  type CreateInfiniteQueryResult,
  createMutation,
  type CreateMutationOptions,
  type CreateMutationResult,
  createQueries,
  createQuery,
  type CreateQueryOptions,
  type CreateQueryResult,
  type InfiniteData,
  type QueriesOptions,
  type QueriesResults,
} from '@tanstack/svelte-query'
import type { Readable } from 'svelte/store'

import type { EdenSvelteQueryConfig } from './types'

export type EdenFetchSvelteQueryHooks<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = { separator: ':param' },
  TEndpoints = EdenFetchEndpoints<TElysia, TElysia['_routes'], TConfig>,
  TQueryEndpoints = {
    [K in keyof TEndpoints as 'get' extends keyof TEndpoints[K] ? K : never]: Pick<
      TEndpoints[K],
      Extract<'get', keyof TEndpoints[K]>
    >
  },
  TMutationEndpoints = {
    [K in keyof TEndpoints as Exclude<keyof TEndpoints[K], QueryMethod> extends never
      ? never
      : K]: Omit<TEndpoints[K], QueryMethod>
  },
  TInfiniteEndpoints = {
    [K in keyof TEndpoints as TEndpoints[K] extends InfiniteQueryRoute
      ? { cursor?: any } extends TEndpoints[K]['get']['query']
        ? K
        : never
      : never]: Pick<TEndpoints[K], Extract<'get', keyof TEndpoints[K]>>
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
    TOptions = Omit<EdenFetchOptions<TMethod, TRoute>, 'body'>,
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

  /**
   * Type only!
   *
   * @internal for testing.
   */
  endpoints: TEndpoints

  /**
   * Type only!
   *
   * @internal for testing.
   */
  queryEndpoints: TQueryEndpoints

  /**
   * Type only!
   *
   * @internal for testing.
   */
  infiniteQueryEndpoints: TEndpoints

  /**
   * Type only!
   *
   * @internal for testing.
   */
  mutationEndpoints: TMutationEndpoints

  createQueries: <T extends any[], TCombinedResult = QueriesResults<T>>(
    callback: (fetch: EdenFetchTanstackQuery<TElysia, TConfig>) => QueriesOptions<T>,
    combine?: (result: QueriesResults<T>) => TCombinedResult,
  ) => Readable<TCombinedResult>
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
> = EdenFetchSvelteQueryHooks<TElysia, TConfig, TEndpoints> & EdenFetch<TElysia, TConfig>

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

  const hooks = {
    types: (types) => {
      return edenFetchSvelteQuery(domain, { ...config, types } as any) as any
    },
    createQuery: (path, ...argArray) => {
      const [options, userOptionsAndEden = {}] = argArray as [any, any]

      const { eden, ...userOptions } = userOptionsAndEden

      const baseQueryOptions = tanstack.queryOptions(path, options, eden)

      const queryOptions = { ...baseQueryOptions, ...userOptions }

      const query = createQuery(queryOptions)

      return query as any
    },
    createInfiniteQuery: (path, ...argArray) => {
      const [options, userOptionsAndEden = {}] = argArray as [any, any]

      const { eden, ...userOptions } = userOptionsAndEden

      const baseQueryOptions = tanstack.infiniteQueryOptions(path, options, eden)

      const infiniteQueryOptions = { ...baseQueryOptions, ...userOptions }

      const infiniteQuery = createInfiniteQuery(infiniteQueryOptions)

      return infiniteQuery as any
    },
    createMutation: (path, ...argArray) => {
      const [options, userOptionsAndEden = {}] = argArray as [any, any]

      const { eden, ...userOptions } = userOptionsAndEden

      const baseMutationOptions = tanstack.mutationOptions(path, options, eden)

      const mutationOptions = { ...baseMutationOptions, ...userOptions }

      const mutation = createMutation(mutationOptions)

      return mutation as any
    },
    endpoints: {} as any,
    queryEndpoints: {} as any,
    infiniteQueryEndpoints: {} as any,
    mutationEndpoints: {} as any,
    createQueries: (callback, options) => {
      const queries = callback(tanstack)
      return createQueries({ queries, ...options })
    },
  } satisfies EdenFetchSvelteQueryHooks<TElysia, TConfig>

  const proxy: any = new Proxy(tanstack as any, {
    get(_target, p, _receiver) {
      return hooks[p as never]
    },
    set(_target, p, newValue, _receiver) {
      if (Object.prototype.hasOwnProperty.call(hooks, p)) {
        hooks[p as keyof typeof hooks] = newValue
      } else {
        tanstack[p as keyof typeof tanstack] = newValue
      }

      return true
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
