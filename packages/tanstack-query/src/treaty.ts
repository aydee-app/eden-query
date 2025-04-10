import type {
  EdenRouteBody,
  EdenRouteError,
  EdenRouteSuccess,
  EdenWs,
  ExtendedEdenRouteOptions,
  FormatParam,
  InternalEdenTypesConfig,
  InternalElysia,
  InternalRouteSchema,
  ParameterFunctionArgs,
  WebSocketClientOptions,
} from '@ap0nia/eden'
import type { MutationOptions, QueryOptions, WithRequired } from '@tanstack/query-core'

export type EdenTreatyTanstackQuery<
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
    : EdenTreatyTanstackQuery<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
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
    [K in keyof TRoutes as FormatParam<K, TSeparator>]: EdenTreatyTanstackQuery<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
  }
  : // prettier-ignore
    (args: ParameterFunctionArgs<TRoutes>) => EdenTreatyTanstackQuery<TElysia, TRoutes[keyof TRoutes], TConfig, [...TPaths, keyof TRoutes]>

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
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  options: {} extends TFinalOptions
    ? void | TFinalOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
) => WithRequired<
  QueryOptions<
    EdenRouteSuccess<TRoute>,
    EdenRouteError<TRoute>,
    EdenRouteSuccess<TRoute>,
    [TPaths, { options: TFinalOptions; type: 'query' }]
  >,
  'queryFn' | 'queryKey'
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
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => WithRequired<
  MutationOptions<
    EdenRouteSuccess<TRoute>,
    EdenRouteError<TRoute>,
    [
      ...({} extends TBody ? [body?: TBody] : [body: TBody]),
      ...({} extends TFinalOptions ? [options?: TFinalOptions] : [options: TFinalOptions]),
    ]
  >,
  'mutationKey' | 'mutationFn'
>

export type EdenTreatySubscriptionRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  ...args: [
    ...({} extends TFinalOptions ? [options?: TFinalOptions] : [options: TFinalOptions]),
    clientOptions?: Partial<WebSocketClientOptions>,
  ]
) => EdenWs<TRoute>
