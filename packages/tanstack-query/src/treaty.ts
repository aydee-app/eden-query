import {
  type EdenConfig,
  type EdenResult,
  type EdenRouteBody,
  type EdenRouteError,
  type EdenRouteSuccess,
  edenTreaty,
  type EdenTreatyProxy,
  type EdenWs,
  type ExtendedEdenRouteOptions,
  type FormatParam,
  getPathParam,
  HTTP_METHODS,
  type InternalEdenTypesConfig,
  type InternalElysia,
  type InternalRouteSchema,
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

export type EdenQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> = {
  queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>
  queryKey: TQueryKey
} & Pick<QueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'behavior'> // At least one property with TError needs to be selected.

export type EdenMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = {
  mutationFn: MutationFunction<TData, TVariables>
  mutationKey: MutationKey
} & Pick<MutationOptions<TData, TError, TVariables, TContext>, 'onSettled'>

/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenTreatyTanstackQueryRoot<TElysia extends InternalElysia = {}> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(
    types?: U,
  ): EdenTreatyTanstackQueryProxy<TElysia, TElysia['_routes'], U>
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
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => EdenQueryOptions<
  EdenRouteSuccess<TRoute>,
  EdenRouteError<TRoute>,
  EdenRouteSuccess<TRoute>,
  [TPaths, { options: ExtendedEdenRouteOptions; type: 'query' }]
>

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
> = <TContext = unknown>(
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => EdenMutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>

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
  treaty: EdenTreatyProxy<TElysia, TElysia['_routes'], TConfig>,
  config?: EdenConfig<TElysia, TConfig>,
  paths: string[] = [],
  pathParams: Record<string, any>[] = [],
) {
  const proxy: any = new Proxy(() => {}, {
    get(_target, p: string, _receiver) {
      const newPaths = [...paths]

      if (p !== 'index') newPaths.push(p)

      return edenTreatyTanstackQueryProxy(treaty[p as never], config, newPaths, pathParams)
    },
    apply(_target, _thisArg, argArray) {
      const pathsCopy = [...paths]

      const method = pathsCopy.pop()?.toUpperCase()

      const lowercaseMethod: any = method?.toLowerCase()

      const pathParam = getPathParam(argArray)

      const isMethod = HTTP_METHODS.includes(lowercaseMethod)

      if (pathParam?.key != null && !isMethod) {
        const allPathParams = [...pathParams, pathParam.param]

        const pathsWithParams = [...paths, `:${pathParam.key}`]

        const nextTreaty = (treaty as any)(...argArray)

        return edenTreatyTanstackQueryProxy(nextTreaty, config, pathsWithParams, allPathParams)
      }

      if (method === 'SUBSCRIBE') {
        return (treaty as any)(...argArray)
      }

      const queryOptions: EdenQueryOptions = {
        queryKey: [],
        queryFn: async (_context) => {
          const result: EdenResult = await (treaty as any)(...argArray)
          return result.data
        },
      }

      if (!method || method === 'GET') {
        queryOptions.queryKey = [paths, { options: argArray[0], type: 'query' }]
      }

      return queryOptions
    },
  })

  return proxy
}

export function edenTanstackQuery<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenConfig<TElysia, TConfig> = {},
): EdenTreatyTanstackQuery<TElysia, ResolveEdenTypeConfig<TConfig>> {
  const root: EdenTreatyTanstackQueryRoot<TElysia> = {
    types: (types) => edenTanstackQuery(domain, { ...config, types } as any) as any,
  }

  const treaty = edenTreaty(domain, config)

  const innerProxy = edenTreatyTanstackQueryProxy(treaty, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never] ?? innerProxy[p]
    },
  })

  return proxy
}
