import { EdenClient } from '../client'
import type { EdenRequestParams } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type {
  EdenRouteBody,
  EdenRouteError,
  EdenRouteOptions,
  EdenRouteSuccess,
} from '../core/infer'
import { resolveEdenRequest } from '../core/resolve'
import type { InternalElysia, InternalRouteSchema } from '../core/types'
import { toArray } from '../utils/array'
import type { IsAny, Join, UnionToIntersection } from '../utils/types'
import type { WebSocketClientOptions } from '../ws/client'
import type {
  EdenConfig,
  EdenHooks,
  InternalEdenTypesConfig,
  ResolveEdenTypeConfig,
} from './config'
import { type FormatParam, replacePathParams } from './path-param'
import { EdenWs } from './ws'

/**
 * Properties available at the Eden-treaty proxy root.
 * Also double as shared hooks and cached configuration for nested proxies.
 *
 * @internal
 */
export type EdenFetchRoot<T extends InternalElysia = {}> = {
  /**
   * Utility function to update the types configuration.
   */
  types<U extends InternalEdenTypesConfig>(types?: U): EdenFetch<T, U>
}

/**
 * Weird work-around for enabling optional parameters in a generic function.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29131#issuecomment-565754001
 *
 * @internal
 */
export type EdenFetchRequester<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TEndpoints = EdenFetchEndpoints<TElysia, TRoutes, TConfig>,
> = <
  TPath extends keyof TEndpoints,
  TEndpoint extends TEndpoints[TPath],
  TMethod extends keyof TEndpoint,
  TRoute extends InternalRouteSchema = Extract<
    TEndpoint[Extract<TMethod extends string ? TMethod : 'get', keyof TEndpoint>],
    InternalRouteSchema
  >,
>(
  path: TPath,
  ...args: {} extends EdenFetchOptions<TMethod, TRoute>
    ? [options?: EdenFetchOptions<TMethod, TRoute>, ...EdenFetchSubscriptionParameters<TMethod>]
    : [options: EdenFetchOptions<TMethod, TRoute>, ...EdenFetchSubscriptionParameters<TMethod>]
) => EdenFetchResponse<TMethod, TRoute>

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
    ? { [Path in Join<TPaths>]: { [method in K]: TRoutes[K] } }
    : EdenFetchEndpoints<
        TElysia,
        TRoutes[K],
        TConfig,
        [...TPaths, K extends `:${string}` ? FormatParam<K, TConfig['separator']> : K]
      >
}[keyof TRoutes]

export type EdenFetchOptions<TMethod, TRoute extends InternalRouteSchema> = (TMethod extends 'get'
  ? {
      method?: Uppercase<TMethod & string>
    }
  : {
      method: Uppercase<TMethod & string>
    }) &
  (TMethod extends 'get' | 'subscribe'
    ? EdenFetchQueryOptions<TRoute>
    : EdenFetchMutationOptions<TRoute>)

export type EdenFetchQueryOptions<T extends InternalRouteSchema> = EdenRouteOptions<T>

export type EdenFetchMutationOptions<
  TRoute extends InternalRouteSchema,
  TBody = EdenRouteBody<TRoute>,
> = EdenRouteOptions<TRoute> & (undefined extends TBody ? { body?: TBody } : { body: TBody })

export type EdenFetchSubscriptionParameters<TMethod> = TMethod extends 'subscribe'
  ? [clientOptions?: Partial<WebSocketClientOptions>]
  : []

export type EdenFetchResponse<
  TMethod,
  TRoute extends InternalRouteSchema,
> = TMethod extends 'subscribe'
  ? EdenWs<TRoute>
  : Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

export type EdenFetch<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenFetchRoot<TElysia> & EdenFetchRequester<TElysia, TElysia['_routes'], TConfig>

export function edenFetch<
  TElysia extends InternalElysia,
  const TConfig extends InternalEdenTypesConfig = {},
>(
  domain?: string,
  config: EdenConfig<TElysia, TConfig> = {},
): EdenFetch<TElysia, ResolveEdenTypeConfig<TConfig>> {
  config.domain ??= domain

  const root: EdenFetchRoot<TElysia> = {
    types: (types) => edenFetch(domain, { ...config, types } as any) as any,
  }

  const client = config.links ? new EdenClient({ links: config.links, ...config }) : undefined

  /**
   * There is not much of a difference between inlining these function calls inside the proxy
   * versus definining them here.
   *
   * `query` and `mutation` are essentially the same thing.
   */
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

  const proxy: any = new Proxy(() => {}, {
    get(_target, p, _receiver) {
      return root[p as never]
    },
    apply(_target, _thisArg, argArray) {
      const method = argArray[1]?.method?.toUpperCase()

      const { body, ...options } = argArray[1] ?? {}

      let params: EdenRequestParams = { method, ...(config as any), body, options }

      const rawPath: string = argArray[0]

      const pathParams = toArray(params.options?.params)

      let path = replacePathParams(rawPath, pathParams, config?.types?.separator)

      path = path.replaceAll('/index', '/')

      params = { path, ...params }

      if (method === 'SUBSCRIBE') {
        return hooks.subscription({ url: config?.domain + path, ...argArray[2] })
      }

      const type = method && method !== 'GET' ? 'mutation' : 'query'

      const result = hooks[type](path, params)

      return result
    },
  })

  return proxy
}
