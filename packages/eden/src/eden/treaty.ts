import { EdenClient } from '../client'
import { GET_OR_HEAD_HTTP_METHODS, HTTP_METHODS } from '../constants'
import type { EdenRequestParams } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type { EdenRouteBody, EdenRouteError, EdenRouteSuccess } from '../core/infer'
import { resolveEdenRequest } from '../core/resolve'
import type { InternalElysia, InternalRouteSchema } from '../core/types'
import type { WebSocketClientOptions } from '../ws/client'
import type {
  EdenConfig,
  EdenHooks,
  ExtendedEdenRouteOptions,
  InternalEdenTypesConfig,
  ResolveEdenTypeConfig,
} from './config'
import {
  type FormatParam,
  getPathParam,
  type ParameterFunctionArgs,
  replacePathParams,
} from './path-param'
import { EdenWs } from './ws'

/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenTreatyRoot<T extends InternalElysia = {}> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(types?: U): EdenTreatyProxy<T, T['_routes'], U>
}

/**
 * Core Eden-Treaty type-implementation.
 *
 * Iterate over every level in the route schema, separating the normal path segments
 * from the path parameter segments, and lower them separately.
 *
 * @internal
 */
export type EdenTreatyProxy<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TParams extends string = Extract<keyof TRoutes, `:${string}`>,
  TNormalRoutes extends Record<string, any> = Omit<TRoutes, TParams>,
  TParamsRoutes extends Record<string, any> = Pick<TRoutes, TParams>,
> = EdenTreatyNormalPathProxy<TElysia, TNormalRoutes, TConfig, TPaths> &
  ({} extends TParamsRoutes
    ? {}
    : EdenTreatyParameterPathProxy<TElysia, TParamsRoutes, TConfig, TPaths>)

/**
 * Iterate over every value.
 * If the value is mapped to a route, then lower it to callable request methods.
 * Otherwise, recursively lower the value as a nested proxy.
 *
 * @internal
 */
export type EdenTreatyNormalPathProxy<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenTreatyRoute<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
    : EdenTreatyProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
}

/**
 * If there is a separator, then this will be a regular proxy with a formatted key for the path parameter.
 * Otherwise, by default it will be a function that returns a lower level of the proxy.
 *
 * @internal
 */
export type EdenTreatyParameterPathProxy<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, any>,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
  TSeparator = TConfig['separator'],
> = TSeparator extends string
  ? {
    // prettier-ignore
    [K in keyof TRoutes as FormatParam<K, TSeparator>]: EdenTreatyProxy<TElysia, TRoutes[K], TConfig, [...TPaths, K]>
  }
  : // prettier-ignore
    (args: ParameterFunctionArgs<TRoutes>) => EdenTreatyProxy<TElysia, TRoutes[keyof TRoutes], TConfig, [...TPaths, keyof TRoutes]>

/**
 * A route typically has three signatures.
 * - query: Up to one argument is allowed, which is {@link EdenExtendedRouteOptions}.
 * - mutation: Up to two arguments are allowed, which are {@link EdenRouteBody} and {@link EdenExtendedRouteOptions}.
 * - subscription: Up to one argument is allowed, which is
 *
 * @internal
 */
export type EdenTreatyRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  TPaths extends any[] = [],
> = TPaths extends [...infer TPathSegments, infer TMethod]
  ? Uppercase<TMethod & string> extends 'GET'
    ? EdenTreatyQueryRoute<TElysia, TRoute, TConfig, TPathSegments>
    : Uppercase<TMethod & string> extends 'SUBSCRIBE'
      ? EdenTreatySubscriptionRoute<TElysia, TRoute, TConfig, TPathSegments>
      : EdenTreatyMutationRoute<TElysia, TRoute, TConfig, TPathSegments>
  : never

/**
 * If a resolved route is a query, then it can be called like the following examples.
 *
 * ```ts
 * const { data, error } = await app.hi.get()
 * const { data, error } = await app.hi.get({ headers: {}, query: {}, params: {} })
 * ```
 *
 * Specific resolver options can be provided at the `eden` property.
 *
 * @internal
 */
export type EdenTreatyQueryRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

/**
 * If a resolved route is a mutation, then it can be called like the following examples.
 *
 * ```ts
 * const { data, error } = await app.hi.post(body)
 * const { data, error } = await app.hi.post(body, { headers: {}, query: {}, params: {} })
 * ```
 *
 * Specific resolver options can be provided at the `eden` property.
 *
 * @internal
 */
export type EdenTreatyMutationRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  body: {} extends TBody ? void | TBody : TBody,
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

/**
 */
export type EdenTreatySubscriptionRoute<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = ExtendedEdenRouteOptions<TElysia, TRoute, TConfig>,
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
  clientOptions?: Partial<WebSocketClientOptions>,
) => EdenWs<TRoute>

/**
 * Core Eden-Treaty implementation.
 *
 * @internal
 */
export function createEdenTreatyProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(
  hooks: EdenHooks,
  config?: EdenConfig<TElysia, TConfig>,
  paths: string[] = [],
  pathParams: Record<string, any>[] = [],
) {
  const proxy: any = new Proxy(() => {}, {
    get(_target, p: string, _receiver) {
      const newPaths = [...paths]

      if (p !== 'index') newPaths.push(p)

      return createEdenTreatyProxy(hooks, config, newPaths, pathParams)
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

        return createEdenTreatyProxy(hooks, config, pathsWithParams, allPathParams)
      }

      let params: EdenRequestParams = { method, ...(config as any) }

      const allPathParams = pathParams

      if (GET_OR_HEAD_HTTP_METHODS.includes(lowercaseMethod)) {
        params = { ...params, ...argArray[0]?.eden, options: argArray[0] }
        if (argArray[0]?.params) allPathParams.push(argArray[0]?.params)
      } else {
        params = { ...params, ...argArray[1]?.eden, body: argArray[0], options: argArray[1] }
        if (argArray[1]?.params) allPathParams.push(argArray[1]?.params)
      }

      const rawPath = pathsCopy.join('/')

      const pathWithParams = replacePathParams(rawPath, allPathParams, config?.types?.separator)

      const path = '/' + pathWithParams

      params = { path, ...params }

      if (method === 'SUBSCRIBE') {
        return hooks.subscription({ url: config?.domain + path, ...argArray[0] })
      }

      const type = method && method !== 'GET' ? 'mutation' : 'query'

      const result = hooks[type](path, params)

      return result
    },
  })

  return proxy
}

/**
 * @public
 */
export type EdenTreaty<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenTreatyRoot<TElysia> & EdenTreatyProxy<TElysia, TElysia['_routes'], TConfig>

/**
 * @public
 *
 * @see https://elysiajs.com/eden/treaty/overview.html
 */
export function edenTreaty<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenConfig<TElysia, TConfig> = {},
): EdenTreaty<TElysia, ResolveEdenTypeConfig<TConfig>> {
  const root: EdenTreatyRoot<TElysia> = {
    types: (types) => edenTreaty(domain, { ...config, types } as any) as any,
  }

  const client = config.links ? new EdenClient({ links: config.links, domain }) : undefined

  const hooks: EdenHooks = {
    query(...args) {
      const result = client?.query(...args) ?? resolveEdenRequest({ path: args[0], ...args[1] })
      return result as any
    },
    mutation(...args) {
      const result = client?.mutation(...args) ?? resolveEdenRequest({ path: args[0], ...args[1] })
      return result as any
    },
    subscription(options) {
      return new EdenWs(options)
    },
  }

  const innerProxy = createEdenTreatyProxy(hooks, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never] ?? innerProxy[p]
    },
  })

  return proxy
}
