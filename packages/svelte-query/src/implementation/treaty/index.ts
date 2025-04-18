import {
  type EdenConfig,
  type EdenResolverConfig,
  type EdenResult,
  type EdenRouteBody,
  type EdenRouteError,
  type EdenRouteInput,
  type EdenRouteSuccess,
  type EdenTreaty,
  edenTreaty,
  type EdenWs,
  type FormatParam,
  getPathParam,
  type InternalEdenTypesConfig,
  type InternalElysia,
  type InternalRouteSchema,
  linkAbortSignals,
  type ParameterFunctionArgs,
  type ResolveEdenTypeConfig,
  type WebSocketClientOptions,
} from '@ap0nia/eden'
import type {
  EdenMutationOptions,
  EdenQueryOptions,
  EdenTanstackQueryConfig,
} from '@ap0nia/eden-tanstack-query'
import {
  createInfiniteQuery,
  type CreateInfiniteQueryResult,
  createMutation,
  type CreateMutationResult,
  createQuery,
  type CreateQueryResult,
  type InfiniteData,
  type MutationOptions,
  type QueryOptions,
} from '@tanstack/svelte-query'

export interface EdenSvelteQueryConfig<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> extends EdenTanstackQueryConfig<TElysia, TConfig> {}

export interface EdenTreatySvelteQueryHooks<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = {},
> {
  createQuery: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => CreateQueryResult

  createInfiniteQuery: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => CreateInfiniteQueryResult

  createMutation: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => CreateMutationResult

  createSubscription: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => EdenWs
}

/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenTreatySvelteQueryRoot<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = {},
> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(
    types?: U,
  ): EdenTreatySvelteQueryProxy<TElysia, TElysia['_routes'], U>

  treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>

  config(config?: EdenSvelteQueryConfig<TElysia, TConfig>): EdenTreatySVelteQuery<TElysia, TConfig>

  hooks: EdenTreatySvelteQueryHooks<TElysia, TConfig>
}

export type EdenTreatySvelteQueryProxy<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TParams extends string = Extract<keyof TRoutes, `:${string}`>,
  TNormalRoutes extends Record<string, any> = Omit<TRoutes, TParams>,
  TParamsRoutes extends Record<string, any> = Pick<TRoutes, TParams>,
> = EdenTreatySvelteQueryPath<TElysia, TNormalRoutes, TConfig, TPaths> &
  ({} extends TParamsRoutes
    ? {}
    : EdenTreatySvelteQueryPathParam<TElysia, TParamsRoutes, TConfig, TPaths>)

export type EdenTreatySvelteQueryPath<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenTreatySvelteQueryRoute<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
    : EdenTreatySvelteQueryProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
}
export type EdenTreatySvelteQueryPathParam<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TSeparator = TConfig['separator'],
> = TSeparator extends string
  ? {
    // prettier-ignore
    [K in keyof TRoutes as FormatParam<K, TSeparator>]: EdenTreatySvelteQueryProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
  }
  : // prettier-ignore
    (args: ParameterFunctionArgs<TRoutes>) => EdenTreatySvelteQueryProxy<TElysia, TRoutes[keyof TRoutes], TConfig, [...TPaths, keyof TRoutes]>

export type EdenTreatySvelteQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = TPaths extends [...infer TPathSegments, infer TMethod]
  ? Uppercase<TMethod & string> extends 'GET'
    ? EdenTreatySvelteQueryQueryRoute<TElysia, TRoute, TConfig, TPathSegments>
    : Uppercase<TMethod & string> extends 'SUBSCRIBE'
      ? EdenTreatySubscriptionRoute<TElysia, TRoute, TConfig, TPathSegments>
      : EdenTreatySvelteQueryMutationRoute<TElysia, TRoute, TConfig, TPathSegments>
  : never

export type EdenTreatySvelteQueryQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  createQuery: (
    ...args: [
      ...({} extends TFinalOptions
        ? [
            options?: TFinalOptions,
            config?: Partial<
              QueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [TPaths, { options: EdenRouteInput; type: 'query' }],
                TOptions extends { query?: { cursor?: any } }
                  ? NonNullable<TOptions['query']>['cursor']
                  : never
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]
        : [
            options: TFinalOptions,
            config?: Partial<
              QueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [TPaths, { options: EdenRouteInput; type: 'query' }],
                TOptions extends { query?: { cursor?: any } }
                  ? NonNullable<TOptions['query']>['cursor']
                  : never
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]),
    ]
  ) => CreateQueryResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>
}

export type EdenTreatySvelteQueryInfiniteQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  createInfiniteQuery: (
    ...args: [
      ...({} extends TFinalOptions
        ? [
            options?: TFinalOptions,
            config?: Partial<
              QueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [TPaths, { options: EdenRouteInput; type: 'query' }],
                TOptions extends { query?: { cursor?: any } }
                  ? NonNullable<TOptions['query']>['cursor']
                  : never
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]
        : [
            options: TFinalOptions,
            config?: Partial<
              QueryOptions<
                EdenRouteSuccess<TRoute>,
                EdenRouteError<TRoute>,
                EdenRouteSuccess<TRoute>,
                [TPaths, { options: EdenRouteInput; type: 'query' }],
                TOptions extends { query?: { cursor?: any } }
                  ? NonNullable<TOptions['query']>['cursor']
                  : never
              >
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]),
    ]
  ) => CreateInfiniteQueryResult<InfiniteData<EdenRouteSuccess<TRoute>>, EdenRouteError<TRoute>>
}

export type EdenTreatySvelteQueryMutationRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  createMutation: <TContext = unknown>(
    ...args: [
      ...({} extends TFinalOptions
        ? [
            options?: TFinalOptions,
            config?: Partial<
              MutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]
        : [
            options: TFinalOptions,
            config?: Partial<
              MutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
            > & {
              eden?: EdenResolverConfig<TElysia, TConfig>
            },
          ]),
    ]
  ) => CreateMutationResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
}

export type EdenTreatySubscriptionRoute<
  _TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = (
  ...args: [
    ...({} extends TFinalOptions ? [options?: TFinalOptions] : [options: TFinalOptions]),
    clientOptions?: Partial<WebSocketClientOptions>,
  ]
) => EdenWs<TRoute>

/**
 * @public
 */
export type EdenTreatySVelteQuery<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenTreatySvelteQueryRoot<TElysia> &
  EdenTreatySvelteQueryProxy<TElysia, TElysia['_routes'], TConfig>

export function edenTreatySvelteQueryProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(
  root: EdenTreatySvelteQueryRoot<TElysia, TConfig>,
  config?: EdenConfig<TElysia, TConfig>,
  paths: string[] = [],
  pathParams: Record<string, any>[] = [],
) {
  const proxy: any = new Proxy(() => {}, {
    get(_target, p: string, _receiver) {
      const newPaths = [...paths]

      if (p !== 'index') newPaths.push(p)

      const nextRoot = { ...root }

      const isHook = Object.prototype.hasOwnProperty.call(root.hooks, p)

      if (!isHook) nextRoot.treaty = nextRoot.treaty[p as never]

      return edenTreatySvelteQueryProxy(nextRoot, config, newPaths, pathParams)
    },
    apply(_target, _thisArg, argArray) {
      const pathsCopy = [...paths]

      const hook = pathsCopy.pop()

      const pathParam = getPathParam(argArray)

      const isHook = hook && Object.prototype.hasOwnProperty.call(root.hooks, hook)

      if (pathParam?.key != null && !isHook) {
        const allPathParams = [...pathParams, pathParam.param]

        const pathsWithParams = [...paths, `:${pathParam.key}`]

        const nextRoot = { ...root }

        nextRoot.treaty = (nextRoot.treaty as any)(...argArray)

        return edenTreatySvelteQueryProxy(nextRoot, config, pathsWithParams, allPathParams)
      }

      if (isHook) {
        return root.hooks[hook as keyof typeof root.hooks](root.treaty, pathsCopy, argArray)
      }
    },
  })

  return proxy
}

export function edenTreatySvelteQuery<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenSvelteQueryConfig<TElysia, TConfig> = {},
): EdenTreatySVelteQuery<TElysia, ResolveEdenTypeConfig<TConfig>> {
  const hooks: EdenTreatySvelteQueryHooks<TElysia, TConfig> = {
    createQuery: (treaty, paths, argArray) => {
      const queryKey = [paths, { options: argArray[0], type: 'query' }]

      const queryOptions: EdenQueryOptions = {
        queryKey,
        queryFn: async (context) => {
          if (config.abortOnUnmount) {
            argArray[1] = { ...argArray[1], fetch: { ...argArray[1]?.fetch } }

            linkAbortSignals(context.signal, argArray[1]?.fetch.signal)

            argArray[1].fetch.signal = context.signal
          }

          const result: EdenResult = await (treaty as any)(...argArray)

          return result.data
        },
      }

      const query = createQuery(queryOptions)

      return query
    },
    createInfiniteQuery: (treaty, paths, argArray) => {
      const queryKey = [paths, { options: argArray[0], type: 'query' }]

      const queryOptions: EdenQueryOptions = {
        queryKey,
        queryFn: async (context) => {
          if (config.abortOnUnmount) {
            argArray[1] = { ...argArray[1], fetch: { ...argArray[1]?.fetch } }

            linkAbortSignals(context.signal, argArray[1]?.fetch.signal)

            argArray[1].fetch.signal = context.signal
          }

          const result: EdenResult = await (treaty as any)(...argArray)

          return result.data
        },
      }

      const infiniteQueryOptions = { ...queryOptions, ...argArray[1] }

      const infiniteQuery = createInfiniteQuery(infiniteQueryOptions)

      return infiniteQuery
    },
    createMutation: (treaty, paths, argArray) => {
      const mutationOptions: EdenMutationOptions = {
        mutationKey: paths,
        mutationFn: async (_context) => {
          const result: EdenResult = await (treaty as any)(...argArray)
          return result.data
        },
      }

      const mutation = createMutation(mutationOptions)

      return mutation
    },
    createSubscription: (treaty, _paths, argArray) => {
      const edenWs = (treaty as any)(...argArray)
      return edenWs
    },
  }

  const root: EdenTreatySvelteQueryRoot<TElysia, TConfig> = {
    types: (types) => edenTreatySvelteQuery(domain, { ...config, types } as any) as any,
    config: (newConfig) => edenTreatySvelteQuery(domain, { ...config, ...newConfig }) as any,
    treaty: edenTreaty(domain, config),
    hooks,
  }

  const innerProxy = edenTreatySvelteQueryProxy(root, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never] ?? innerProxy[p]
    },
  })

  return proxy
}
