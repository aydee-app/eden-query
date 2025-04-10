import {
  type EdenConfig,
  type EdenResult,
  type EdenRouteBody,
  type EdenRouteError,
  type EdenRouteSuccess,
  type EdenTreaty,
  edenTreaty,
  type EdenWs,
  type ExtendedEdenRouteOptions,
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
  DefaultError,
  MutationFunction,
  MutationKey,
  MutationOptions,
  QueryFunction,
  QueryKey,
  QueryOptions,
} from '@tanstack/query-core'

export interface EdenTreatyTanstackQueryHooks<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = {},
> {
  queryOptions: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => EdenQueryOptions

  mutationOptions: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => EdenMutationOptions

  subscribe: (
    treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>,
    paths: string[],
    argArray: any[],
  ) => EdenWs
}

export interface EdenTanstackQueryConfig<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> extends EdenConfig<TElysia, TConfig> {
  /**
   * Whether to forward the signal from tanstack-query to the fetch request options.
   */
  forwardSignal?: boolean
}

export type EdenQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>
    queryKey: TQueryKey
  } & Pick<QueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'retry'>

export type EdenMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    mutationFn: MutationFunction<TData, TVariables>
    mutationKey: MutationKey
  } & Pick<MutationOptions<TData, TError, TVariables, TContext>, 'retry'>

/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenTreatyTanstackQueryRoot<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = {},
> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(
    types?: U,
  ): EdenTreatyTanstackQueryProxy<TElysia, TElysia['_routes'], U>

  treaty: EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>>

  hooks: EdenTreatyTanstackQueryHooks<TElysia, TConfig>
}

export type EdenTreatyTanstackQueryProxy<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TParams extends string = Extract<keyof TRoutes, `:${string}`>,
  TNormalRoutes extends Record<string, any> = Omit<TRoutes, TParams>,
  TParamsRoutes extends Record<string, any> = Pick<TRoutes, TParams>,
> = EdenTreatyTanstackQueryPath<TElysia, TNormalRoutes, TConfig, TPaths> &
  ({} extends TParamsRoutes
    ? {}
    : EdenTreatyTanstackQueryPathParam<TElysia, TParamsRoutes, TConfig, TPaths>)

export type EdenTreatyTanstackQueryPath<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenTreatyTanstackQueryRoute<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
    : EdenTreatyTanstackQueryProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
}
export type EdenTreatyTanstackQueryPathParam<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TSeparator = TConfig['separator'],
> = TSeparator extends string
  ? {
    // prettier-ignore
    [K in keyof TRoutes as FormatParam<K, TSeparator>]: EdenTreatyTanstackQueryProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
  }
  : // prettier-ignore
    (args: ParameterFunctionArgs<TRoutes>) => EdenTreatyTanstackQueryProxy<TElysia, TRoutes[keyof TRoutes], TConfig, [...TPaths, keyof TRoutes]>

export type EdenTreatyTanstackQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = TPaths extends [...infer TPathSegments, infer TMethod]
  ? Uppercase<TMethod & string> extends 'GET'
    ? EdenTreatyTanstackQueryQueryRoute<TElysia, TRoute, TConfig, TPathSegments>
    : Uppercase<TMethod & string> extends 'SUBSCRIBE'
      ? EdenTreatySubscriptionRoute<TElysia, TRoute, TConfig, TPathSegments>
      : EdenTreatyTanstackQueryMutationRoute<TElysia, TRoute, TConfig, TPathSegments>
  : never

export type EdenTreatyTanstackQueryQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  queryOptions: (
    options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
  ) => EdenQueryOptions<
    EdenRouteSuccess<TRoute>,
    EdenRouteError<TRoute>,
    EdenRouteSuccess<TRoute>,
    [TPaths, { options: ExtendedEdenRouteOptions; type: 'query' }],
    TOptions extends { query: { cursor?: any } } ? TOptions['query']['cursor'] : never
  >
}

export type EdenTreatyTanstackQueryMutationRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  mutationOptions: <TContext = unknown>(
    options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
  ) => EdenMutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
}

export type EdenTreatySubscriptionRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
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
export type EdenTreatyTanstackQuery<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenTreatyTanstackQueryRoot<TElysia> &
  EdenTreatyTanstackQueryProxy<TElysia, TElysia['_routes'], TConfig>

export function edenTreatyTanstackQueryProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(
  root: EdenTreatyTanstackQueryRoot<TElysia, TConfig>,
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

      return edenTreatyTanstackQueryProxy(nextRoot, config, newPaths, pathParams)
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

        return edenTreatyTanstackQueryProxy(nextRoot, config, pathsWithParams, allPathParams)
      }

      if (isHook) {
        return root.hooks[hook as keyof typeof root.hooks](root.treaty, pathsCopy, argArray)
      }
    },
  })

  return proxy
}

export function edenTreatyTanstackQuery<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenTanstackQueryConfig<TElysia, TConfig> = {},
): EdenTreatyTanstackQuery<TElysia, ResolveEdenTypeConfig<TConfig>> {
  const hooks: EdenTreatyTanstackQueryHooks<TElysia, TConfig> = {
    queryOptions: (treaty, paths, argArray) => {
      const queryKey = [paths, { options: argArray[0], type: 'query' }]

      const queryOptions: EdenQueryOptions = {
        queryKey,
        queryFn: async (context) => {
          if (config.forwardSignal) {
            const options: ExtendedEdenRouteOptions = argArray[0]
            options.eden ??= {}
            options.eden.fetch ??= {}
            linkAbortSignals(context.signal, options.eden.fetch.signal)
            options.eden.fetch.signal = context.signal
          }
          const result: EdenResult = await (treaty as any)(...argArray)
          return result.data
        },
      }

      return queryOptions
    },
    mutationOptions: (treaty, paths, argArray) => {
      const mutationOptions: EdenMutationOptions = {
        mutationKey: paths,
        mutationFn: async (_context) => {
          const result: EdenResult = await (treaty as any)(...argArray)
          return result.data
        },
      }

      return mutationOptions
    },
    subscribe: (treaty, _paths, argArray) => {
      const edenWs = (treaty as any)(...argArray)
      return edenWs
    },
  }

  const root: EdenTreatyTanstackQueryRoot<TElysia, TConfig> = {
    types: (types) => edenTreatyTanstackQuery(domain, { ...config, types } as any) as any,
    treaty: edenTreaty(domain, config),
    hooks,
  }

  const innerProxy = edenTreatyTanstackQueryProxy(root, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never] ?? innerProxy[p]
    },
  })

  return proxy
}
