import { EdenClient } from '../client'
import { GET_OR_HEAD_HTTP_METHODS, HTTP_METHODS } from '../constants'
import type { EdenRequestOptions, EdenResolverConfig } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type { EdenRouteBody, EdenRouteError, EdenRouteInput, EdenRouteSuccess } from '../core/infer'
import { resolveEdenRequest } from '../core/resolve'
import type { InternalElysia, InternalRouteSchema } from '../core/types'
import type { WebSocketClientOptions } from '../ws/client'
import type { EdenConfig, InternalEdenTypesConfig, ResolveEdenTypeConfig } from './config'
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
export type EdenTreatyRoot<
  TElysia extends InternalElysia = {},
  TConfig extends InternalEdenTypesConfig = {},
> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(
    types?: U,
  ): EdenTreatyProxy<TElysia, TElysia['_routes'], U>

  config(config?: EdenConfig<TElysia, TConfig>): EdenTreaty<TElysia, TConfig>

  client?: EdenClient<TElysia>
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
 * - query: Up to two arguments are allowed.
 * - mutation: Up to three arguments are allowed.
 * - subscription: Up to one argument is allowed.
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
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = (
  ...args: {} extends TFinalOptions
    ? [options?: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]
    : [options: TFinalOptions, config?: EdenResolverConfig<TElysia, TConfig>]
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
  TOptions = EdenRouteInput<TRoute>,
  TFinalOptions = TConfig['separator'] extends string
    ? TOptions
    : Omit<TOptions, 'params'> & { params?: Record<string, any> },
> = (
  ...args: {} extends TBody
    ? [
        body?: TBody,
        ...({} extends TFinalOptions ? [options?: TFinalOptions] : [options: TFinalOptions]),
        config?: EdenResolverConfig<TElysia, TConfig>,
      ]
    : [
        body: TBody,
        ...({} extends TFinalOptions ? [options?: TFinalOptions] : [options: TFinalOptions]),
        config?: EdenResolverConfig<TElysia, TConfig>,
      ]
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

/**
 */
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
  ...args: {} extends TFinalOptions
    ? [options?: TFinalOptions, clientOptions?: Partial<WebSocketClientOptions>]
    : [options: TFinalOptions, clientOptions?: Partial<WebSocketClientOptions>]
) => EdenWs<TRoute>

export type EdenTreatyInferInput<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
  TRoutes = TElysia['_routes'],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? Uppercase<K & string> extends 'GET'
      ? EdenRouteInput<TRoutes[K]>
      : { body: EdenRouteBody<TRoutes[K]> } & EdenRouteInput<TRoutes[K]>
    : EdenTreatyInferInput<TElysia, TConfig, TRoutes[K]>
}

export type EdenTreatyInferOutput<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
  TRoutes = TElysia['_routes'],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenRouteSuccess<TRoutes[K]>
    : EdenTreatyInferOutput<TElysia, TConfig, TRoutes[K]>
}

/**
 * Core Eden-Treaty implementation.
 *
 * @internal
 */
export function edenTreatyProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(
  root: EdenTreatyRoot<TElysia, TConfig>,
  config?: EdenConfig<TElysia, TConfig>,
  paths: string[] = [],
  pathParams: Record<string, any>[] = [],
) {
  const proxy: any = new Proxy(() => {}, {
    get(_target, p: string, _receiver) {
      const newPaths = [...paths]

      if (p !== 'index') newPaths.push(p)

      return edenTreatyProxy(root, config, newPaths, pathParams)
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

        return edenTreatyProxy(root, config, pathsWithParams, allPathParams)
      }

      let params: EdenRequestOptions = { method, ...(config as any) }

      const allPathParams = pathParams

      if (GET_OR_HEAD_HTTP_METHODS.includes(lowercaseMethod)) {
        params = { ...params, ...argArray[1], input: argArray[0] }
        if (argArray[0]?.params) allPathParams.push(argArray[0]?.params)
      } else {
        params = { ...params, ...argArray[2], body: argArray[0], input: argArray[1] }
        if (argArray[1]?.params) allPathParams.push(argArray[1]?.params)
      }

      const rawPath = pathsCopy.join('/')

      const pathWithParams = replacePathParams(rawPath, allPathParams, config?.types?.separator)

      const path = '/' + pathWithParams

      params = { path, ...params }

      if (method === 'SUBSCRIBE') {
        return new EdenWs({ url: config?.domain + path, ...argArray[0] })
      }

      const type = method && method !== 'GET' ? 'mutation' : 'query'

      const result = root?.client?.[type](path, params) ?? resolveEdenRequest({ path, ...params })

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
  const root: EdenTreatyRoot<TElysia, TConfig> = {
    types: (types) => edenTreaty(domain, { ...config, types } as any) as any,
    config: (config) => edenTreaty(domain, config) as any,
    client: config.links ? new EdenClient({ links: config.links, domain }) : undefined,
  }

  const innerProxy = edenTreatyProxy(root, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      if (Object.prototype.hasOwnProperty.call(root, p)) return root[p as never]
      return innerProxy[p]
    },
    set(_target, p, newValue, _receiver) {
      if (Object.prototype.hasOwnProperty.call(root, p)) {
        root[p as keyof typeof root] = newValue
      }
      return true
    },
  })

  return proxy
}
