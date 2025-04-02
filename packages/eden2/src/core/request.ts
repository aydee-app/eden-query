import type { InternalElysia } from '../elysia'
import type { EdenResolverConfig, EdenTypeConfig } from './config'
import type { EdenRouteBody, EdenRouteOptions } from './infer'

/**
 * Resolver input for a specific request.
 */
export interface EdenRequestInit {
  /**
   * Fetch options for a "query" method, i.e. "GET", "HEAD", "OPTIONS".
   */
  options?: EdenRouteOptions

  /**
   * The request body for "POST", "PATCH", etc. requests.
   */
  body?: EdenRouteBody

  /**
   */
  path?: string

  /**
   */
  method?: string
}

/**
 * Parameters that control how an Eden request is resolved.
 *
 * Some information is duplicated in the {@link EdenResolverConfig} properties.
 * For example, {@link EdenRequestParams.options.headers} and {@link EdenResolverConfig.headers}.
 * Values in the request-specific options will have greater precedence
 * than the global resolver configuration options.
 */
export type EdenRequestParams<
  T extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = undefined,
> = EdenResolverConfig<T, TKey> & EdenRequestInit
