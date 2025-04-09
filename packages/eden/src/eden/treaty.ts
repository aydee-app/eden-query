import { EdenClient } from '../client'
import { GET_OR_HEAD_HTTP_METHODS, HTTP_METHODS } from '../constants'
import type { EdenRequestParams, EdenResolverConfig } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type {
  EdenRouteBody,
  EdenRouteError,
  EdenRouteOptions,
  EdenRouteSuccess,
} from '../core/infer'
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
import { EdenWs as EdenWebSocket, EdenWs } from './ws'

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
  types<U extends InternalEdenTypesConfig>(types: U): EdenTreatyProxy<T['_routes'], U>

  /**
   * Eden resolves requests in two possible modes.
   * 1. Links mode.
   * 2. Basic HTTP networking mode.
   *
   * Based on Apollo GraphQL.
   * @see https://www.apollographql.com/docs/react/api/link/introduction
   *
   * By default, HTTP networking mode will call {@link resolveEdenRequest}.
   * If links are provided, then an {@link EdenClient} will be initialized and requests will
   * be resolved through this client.
   */
  client?: EdenClient<T>
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
 *
 * Iterate over every value.
 * If the value is mapped to a route, then lower it to callable request methods.
 * Otherwise, recursively lower the value as a nested proxy.
 *
 * @internal
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
 * If there is a separator, then this will be a regular proxy with a formatted key for the path parameter.
 * Otherwise, by default it will be a function that returns a lower level of the proxy.
 *
 * @internal
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

/**
 * A route typically has three signatures.
 * - query: Up to one argument is allowed, which is {@link EdenRouteOptions}.
 * - mutation: Up to two arguments are allowed, which are {@link EdenRouteBody} and {@link EdenRouteOptions}.
 * - subscription: Up to one argument is allowed, which is
 *
 * @internal
 */
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
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = EdenRouteOptions<TRoute> & { eden?: EdenResolverConfig },
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
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TBody = EdenRouteBody<TRoute>,
  TOptions = EdenRouteOptions<TRoute> & { eden?: EdenResolverConfig },
  TFinalOptions = TConfig['separator'] extends string ? TOptions : Omit<TOptions, 'params'>,
> = (
  body: {} extends TBody ? void | TBody : TBody,
  options: {} extends TFinalOptions ? void | TFinalOptions : TFinalOptions,
) => Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

/**
 */
export type EdenTreatySubscriptionRoute<
  TRoute extends InternalRouteSchema,
  _TConfig extends InternalEdenTypesConfig = {},
  _TPaths extends any[] = [],
  TOptions = WebSocketClientOptions,
> = (options?: TOptions) => EdenWs<TRoute>

/**
 * Core Eden-Treaty implementation.
 *
 * @internal
 */
export function createEdenTreatyProxy<
  TElysia extends InternalElysia = any,
  TConfig extends InternalEdenTypesConfig = any,
>(
  root: EdenTreatyRoot,
  config?: EdenConfig<TElysia, TConfig>,
  paths: string[] = [],
  pathParams: Record<string, any>[] = [],
) {
  const proxy: any = new Proxy(() => {}, {
    get(_target, p: string, _receiver) {
      const newPaths = [...paths]

      if (p !== 'index') newPaths.push(p)

      return createEdenTreatyProxy(root, config, newPaths, pathParams)
    },
    apply(_target, _thisArg, argArray) {
      /**
       * @example ['nendoroid', 'get']
       */
      const pathsCopy = [...paths]

      /**
       * @example 'get', 'post', 'patch'
       */
      const method = pathsCopy.pop()?.toUpperCase() ?? ''

      /**
       * Determine whether a path parameter can be found from the provided args.
       *
       * @example { param: { id: '123' }, key: 'id' }
       *
       * The `param` property is the actual argument that was passed,
       * while the key is the string representing the placeholder.
       */
      const pathParam = getPathParam(argArray)

      /**
       * Determine if the property can be found on the root hooks.
       * @example "createQuery," "createMutation," etc.
       */
      const isMethod = HTTP_METHODS.includes(method.toLowerCase() as any)

      // This is a valid path parameter call, and it no HTTP method was found.

      if (pathParam?.key != null && !isMethod) {
        /**
         * An array of objects representing path parameter replacements.
         * @example [ writable({ id: 123 }) ]
         */
        const allPathParams = [...pathParams, pathParam.param]

        /**
         * Path parameter strings including the current path parameter as a placeholder.
         *
         * @example [ 'nendoroid', ':id' ]
         */
        const pathsWithParams = [...paths, `:${pathParam.key}`]

        return createEdenTreatyProxy(root, config, pathsWithParams, allPathParams)
      }

      const rawPath = pathsCopy.join('/')

      const path = replacePathParams(rawPath, pathParams, config?.types?.separator)

      if (method === 'SUBSCRIPTION') {
        return new EdenWebSocket({ url: config?.domain + path, ...argArray[0] })
      }

      let params: EdenRequestParams = { path, method, ...(config as any) }

      if (GET_OR_HEAD_HTTP_METHODS.includes(method as any)) {
        params = { ...params, ...argArray[0]?.eden, options: argArray[0] }
      } else {
        params = { ...params, ...argArray[1]?.eden, body: argArray[0], options: argArray[1] }
      }

      const type = method && method !== 'GET' ? 'mutation' : 'query'

      const result = root.client?.[type](path, params) ?? resolveEdenRequest(params)

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
> = EdenTreatyRoot<TElysia> & EdenTreatyProxy<TElysia['_routes'], TConfig>

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
    types: (types) => {
      // possible alternative: mutate the config and return the same proxy.
      // config.types = types as any
      // return proxy
      return edenTreaty(domain, { ...config, types } as any)
    },
  }

  if (config?.links) {
    root.client = new EdenClient({ links: config.links })
  }

  const innerProxy = createEdenTreatyProxy(root, { domain, ...config } as any)

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never] ?? innerProxy[p]
    },
  })

  return proxy
}
