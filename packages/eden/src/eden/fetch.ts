import { EdenClient } from '../client'
import type { EdenRequestOptions, EdenResolverConfig } from '../core/config'
import type { EdenFetchResult } from '../core/dto'
import type { EdenRouteBody, EdenRouteError, EdenRouteInput, EdenRouteSuccess } from '../core/infer'
import { resolveEdenRequest } from '../core/resolve'
import type { ExtractRoutes, InternalElysia, InternalRouteSchema } from '../core/types'
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

  client?: EdenClient<T>
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
> =
  /**
   * @template TMethod The uppercase HTTP method.
   *   IMPORTANT: will not work with mixed-case custom methods.
   *   Eden-Fetch will attempt to find a matching route with either the fully uppercase or lowercase HTTP method.
   *
   *   @see https://elysiajs.com/essential/route.html#custom-method
   *
   *   BAD - mixed-case: app.route('M-search', '/m-search', 'connect')
   *   OK - uppercase: app.route('M-SEARCH', '/m-search', 'connect')
   *   OK - lowercase: app.route('m-search', '/m-search', 'connect')
   */
  <
    TPath extends keyof TEndpoints,
    TEndpoint extends TEndpoints[TPath],
    TMethod extends Uppercase<keyof TEndpoint & string> | undefined,
    TRoute extends InternalRouteSchema = Extract<
      TEndpoint[Extract<
        undefined extends TMethod ? 'GET' | 'get' : TMethod | Lowercase<TMethod & string>,
        keyof TEndpoint
      >],
      InternalRouteSchema
    >,
    TOptions = EdenFetchOptions<TMethod, TRoute>,
  >(
    path: TPath,
    ...args: [
      ...({} extends TOptions
        ? [
            options?: EdenFetchOptions<TMethod, TRoute>,
            ...(TMethod extends 'subscribe'
              ? [clientOptions?: Partial<WebSocketClientOptions>]
              : [config?: EdenResolverConfig<TElysia, TConfig>]),
          ]
        : [
            options: EdenFetchOptions<TMethod, TRoute>,
            ...(TMethod extends 'subscribe'
              ? [clientOptions?: Partial<WebSocketClientOptions>]
              : [config?: EdenResolverConfig<TElysia, TConfig>]),
          ]),
    ]
  ) => TMethod extends 'SUBSCRIBE' ? EdenWs<TRoute> : EdenFetchResponse<TMethod, TRoute>

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

/**
 * Does NOT include body.
 */
export type EdenFetchOptions<
  TMethod,
  TRoute extends InternalRouteSchema,
> = ('GET' extends NoInfer<TMethod>
  ? {
      method?: NonNullable<TMethod>
    }
  : 'SUBSCRIBE' extends NoInfer<TMethod>
    ? {
        method: NonNullable<TMethod>
      }
    : {
        method: NonNullable<TMethod>
      }) &
  EdenRouteInput<TRoute>

export type EdenFetchFullInput<
  TRoute extends InternalRouteSchema,
  TBody = EdenRouteBody<TRoute>,
> = EdenRouteInput<TRoute> & (undefined extends TBody ? { body?: TBody } : { body: TBody })

export type EdenFetchResponse<
  TMethod,
  TRoute extends InternalRouteSchema,
> = TMethod extends 'subscribe'
  ? EdenWs<TRoute>
  : Promise<EdenFetchResult<EdenRouteSuccess<TRoute>, EdenRouteError<TRoute>>>

export type EdenFetch<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenFetchRoot<TElysia> & EdenFetchRequester<TElysia, ExtractRoutes<TElysia>, TConfig>

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
    client: config.links ? new EdenClient({ links: config.links, ...config }) : undefined,
  }

  /**
   * There is not much of a difference between inlining these function calls inside the proxy
   * versus definining them here.
   *
   * `query` and `mutation` are essentially the same thing.
   */
  const hooks: EdenHooks = {
    query(path, params) {
      const result = root.client?.query(path, params) ?? resolveEdenRequest({ path, ...params })
      return result as any
    },
    mutation(path, params) {
      const result = root.client?.mutation(path, params) ?? resolveEdenRequest({ path, ...params })
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
    set(_target, p, newValue, _receiver) {
      if (Object.prototype.hasOwnProperty.call(root, p)) {
        root[p as keyof typeof root] = newValue
      }
      return true
    },
    apply(_target, _thisArg, argArray) {
      const method = argArray[1]?.method?.toUpperCase()

      const [rawPath, optionsOrBody] = argArray

      let params: EdenRequestOptions = { method, ...(config as any), ...argArray[2] }

      params.input = optionsOrBody

      if (method && method !== 'GET') {
        params.body = optionsOrBody.body
      }

      const pathParams = toArray(params.input?.params)

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
