import {
  type EdenConfig,
  type EdenResolverConfig,
  type EdenResult,
  type EdenRouteBody,
  type EdenRouteError,
  type EdenRouteOptions,
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

import type { EdenMutationOptions, EdenQueryOptions, EdenTanstackQueryConfig } from './shared'

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

  config(
    config?: EdenTanstackQueryConfig<TElysia, TConfig>,
  ): EdenTreatyTanstackQuery<TElysia, TConfig>

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
  TOptions = EdenRouteOptions<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  queryOptions: (
    ...args: [
      ...({} extends TFinalOptions
        ? [options?: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]
        : [options: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]),
    ]
  ) => EdenQueryOptions<
    EdenRouteSuccess<TRoute>,
    EdenRouteError<TRoute>,
    EdenRouteSuccess<TRoute>,
    [TPaths, { options: EdenRouteOptions; type: 'query' }],
    TOptions extends { query?: { cursor?: any } } ? NonNullable<TOptions['query']>['cursor'] : never
  >

  // createQueries and useQueries may not be able to strongly type TError.
  queriesOptions: (
    ...args: [
      ...({} extends TFinalOptions
        ? [options?: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]
        : [options: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]),
    ]
  ) => EdenQueryOptions<
    EdenRouteSuccess<TRoute>,
    Error,
    EdenRouteSuccess<TRoute>,
    [TPaths, { options: EdenRouteOptions; type: 'query' }],
    TOptions extends { query?: { cursor?: any } } ? NonNullable<TOptions['query']>['cursor'] : never
  >
}

export type EdenTreatyTanstackQueryMutationRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = EdenRouteOptions<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = {
  mutationOptions: <TContext = unknown>(
    ...args: [
      ...({} extends TFinalOptions
        ? [options?: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]
        : [options: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]),
    ]
  ) => EdenMutationOptions<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>, TBody, TContext>
}

export type EdenTreatySubscriptionRoute<
  _TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = EdenRouteOptions<TRoute>,
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
          if (config.abortOnUnmount) {
            argArray[1] = { ...argArray[1], fetch: { ...argArray[1]?.fetch } }

            linkAbortSignals(context.signal, argArray[1]?.fetch.signal)

            argArray[1].fetch.signal = context.signal
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
    config: (newConfig) => edenTreatyTanstackQuery(domain, { ...config, ...newConfig }) as any,
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
