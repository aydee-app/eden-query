import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenResult } from './dto'
import type { EdenError } from './error'
import type { FetchEsque, HeadersEsque } from './http'
import type { EdenRouteBody, EdenRouteOptions } from './infer'
import type { TransformerConfig } from './transform'
import type { InternalElysia, TypeConfig } from './types'

export type EdenTypeConfig<T extends TypeConfig> = {
  types?: T
}

/**
 * Accepted headers includes any object that resembles headers, or a promise that resolves to one.
 * If a callback is provided, it will be called with the current params.
 * The callback can return header-esque objects to merge with the params, or mutate the params directly.
 * An array of the previously mentioned types can be provided, and each will be handled accordingly.
 */
export type EdenRequestHeaders<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = HeadersEsque<[EdenRequestParams<TElysia, TConfig>]>

/**
 */
export type EdenRequestTransformer<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = (
  path: string,
  options: RequestInit,
  params: EdenRequestParams<TElysia, TConfig>,
) => MaybePromise<RequestInit | void>

/**
 */
export type EdenResponseTransformer<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = (response: Response, params: EdenRequestParams<TElysia, TConfig>) => MaybePromise<unknown>

/**
 */
export type EdenResultTransformer<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = (
  result: EdenResult<any, EdenError>,
  params: EdenRequestParams<TElysia, TConfig>,
) => MaybePromise<EdenResult<any, EdenError> | Nullish>

/**
 * Configure the global behavior of the request resolver.
 */
export type EdenResolverConfig<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = EdenTypeConfig<TConfig> &
  TransformerConfig<TElysia, TConfig> & {
    /**
     * Global query parameters for requests.
     */
    query?: Record<string, any>

    /**
     * Global fetch options.
     */
    fetch?: Omit<RequestInit, keyof EdenResolverConfig>

    /**
     * Ponyfill for fetch.
     *
     * Feature is available in both tRPC and eden (official).
     *
     * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L29
     * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L164
     */
    fetcher?: FetchEsque

    /**
     * Global headers, provide a function to compute headers based on the request.
     */
    headers?: EdenRequestHeaders<TElysia, TConfig>

    /**
     * Function(s) that can transform the request before it gets resolved.
     *
     * @default Eden provides a default that will apply transformers serializers with JSON or FormData bodies.
     */
    onRequest?: MaybeArray<EdenRequestTransformer<TElysia, TConfig>>

    /**
     * Function(s) that can transform the response before processing the result.
     * Each function will be called in sequence, stopping at the first one that returns data or an error.
     * The returned data or error will be used as the result.
     *
     * @default Eden provides a default that will attempt to parse the data from the {@link Response}.
     */
    onResponse?: MaybeArray<EdenResponseTransformer<TElysia, TConfig>>

    /**
     * Function(s) that can transform the result before the resolver resolves.
     *
     * @default Eden provides a default that will apply transformer deserializations to the response data.
     */
    onResult?: MaybeArray<EdenResultTransformer<TElysia, TConfig>>

    /**
     * Whether to dynamically resolve the domain.
     *
     * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L477
     */
    keepDomain?: boolean

    /**
     * Either an origin or the Elysia.js application.
     */
    domain?: TElysia | string

    /**
     * Passed as second argument to new URL if applicable.
     *
     * Basically {@link EdenRequestInit.domain} but always a string representing the "origin" of the request.
     *
     * @example
     *
     * ```ts
     * const base = 'http://e.ly'
     * const path = '/posts/123'
     *
     * const url = new URL(path, base)
     * ```
     */
    base?: string

    /**
     * Default HTTP method for the request.
     *
     * Based on `methodOverride` from tRPC.
     *
     * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L35
     */
    method?: string
  }

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
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = EdenResolverConfig<TElysia, TConfig> & EdenRequestInit
