import type { EdenResolverConfig } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type {
  EdenRouteBody,
  EdenRouteError,
  EdenRouteOptions,
  EdenRouteParams,
  EdenRouteSuccess,
} from '../core/infer'
import type { InternalElysia, InternalRouteSchema, InternalTypeConfig } from '../core/types'
import type { ExtractString, StringReplace } from '../utils/types'

export type ParamKey = 'param'

export type FormatParam<T, U> = StringReplace<U, ParamKey, ExtractString<T, ':'>>

export interface InternalEdenTypesConfig extends InternalTypeConfig {
  separator?: `${string}${ParamKey}${string}`
}

export type EdenTypesConfig = InternalEdenTypesConfig | undefined | unknown

export type ResolveEdenTypeConfig<T> = T extends InternalEdenTypesConfig ? T : never

/**
 * Additional properties available at the Eden-treaty proxy root.
 */
export type EdenTreatyRoot<TElysia extends InternalElysia = {}> = {
  types<TConfig extends InternalEdenTypesConfig>(
    config?: TConfig,
  ): EdenTreatyProxy<TElysia['_routes'], TConfig>
}

/**
 * Eden-Treaty proxy.
 */
export type EdenTreatyProxy<
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TParams extends string = Extract<keyof TRoutes, `:${string}`>,
  TNormalRoutes extends Record<string, any> = Omit<TRoutes, TParams>,
  TParamsRoutes extends Record<string, any> = Pick<TRoutes, TParams>,
> = EdenTreatyNormalPathProxy<TNormalRoutes, TConfig, TPaths> &
  ({} extends TParamsRoutes ? {} : EdenTreatyParameterPathProxy<TParamsRoutes, TConfig, TPaths>)

/**
 * Mapping for a normal path.
 */
export type EdenTreatyNormalPathProxy<
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenTreatyRoute<TRoutes[K], TConfig, [...TPaths, K]>
    : EdenTreatyProxy<TRoutes[K], TConfig, [...TPaths, K]>
}

/**
 * Mapping for a path parameter.
 *
 * @example ':id'
 */
export type EdenTreatyParameterPathProxy<
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TSeparator = TConfig['separator'],
> = TSeparator extends string
  ? {
    // prettier-ignore
    [K in keyof TRoutes as FormatParam<K, TSeparator>]: EdenTreatyProxy<TRoutes[K], TConfig, [...TPaths, K]>
  }
  : // prettier-ignore
    (args: ParameterFunctionArgs<TRoutes>) => EdenTreatyProxy<TRoutes[keyof TRoutes], TConfig, [...TPaths, keyof TRoutes]>

type ParameterFunctionArgs<T> = {
  [K in keyof T]: {
    [Key in ExtractString<K, ':'>]: string | number
  }
}[keyof T]

export type EdenTreatyRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = TPaths extends [...infer TPathSegments, infer TMethod]
  ? Uppercase<TMethod & string> extends 'GET'
    ? EdenTreatyQueryRoute<TRoute, TConfig, TPathSegments>
    : Uppercase<TMethod & string> extends 'SUBSCRIPTION'
      ? EdenTreatySubscriptionRoute<TRoute, TConfig, TPathSegments>
      : EdenTreatyMutationRoute<TRoute, TConfig, TPathSegments>
  : TPaths

export type EdenTreatyQueryRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = EdenRouteOptions<TRoute>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

export type EdenTreatyMutationRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = EdenRouteOptions<TRoute>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  body: {} extends TBody ? void | TBody : TBody,
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

export type EdenTreatySubscriptionRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = EdenRouteOptions<TRoute>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : TOptions & EdenRouteParams<{}>,
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

export type EdenTreaty<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenTreatyRoot<TElysia> & EdenTreatyProxy<TElysia['_routes'], TConfig>

export type EdenConfig<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenResolverConfig<TElysia, TConfig> & {
  types: TConfig
}

export function createEdenTreatyProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(domain?: string, config?: EdenConfig<TElysia, TConfig>, paths: string[] = []) {
  domain
  config
  paths

  const proxy: any = new Proxy(() => {}, {
    get(target, p, receiver) {
      target
      p
      receiver
    },
    apply(target, thisArg, argArray) {
      target
      thisArg
      argArray
    },
  })

  return proxy
}

export function edenTreaty<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config?: EdenConfig<TElysia, TConfig>,
): EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>> {
  const proxy = createEdenTreatyProxy(domain, config)
  return proxy
}
