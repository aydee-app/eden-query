import type { AnyElysia } from 'elysia'

import type { DataTransformerOptions } from '../trpc/server/transformer'
import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenFetchError } from './errors'
import type { FetchEsque } from './fetch'
import type { HeadersEsque } from './headers'
import type { EdenRequestParams } from './request'
import type { EdenResult } from './response'

/**
 * Accepted headers includes any object that resembles headers, or a promise that resolves to one.
 * If a callback is provided, it will be called with the current params.
 * The callback can return header-esque objects to merge with the params, or mutate the params directly.
 * An array of the previously mentioned types can be provided, and each will be handled accordingly.
 */
export type EdenRequestHeaders = HeadersEsque<[EdenRequestParams]>

export type EdenRequestTransformer = (
  path: string,
  options: RequestInit,
  params: EdenRequestParams,
) => MaybePromise<RequestInit | void>

export type EdenResponseTransformer = (
  response: Response,
  params: EdenRequestParams,
) => MaybePromise<unknown>

export type EdenResultTransformer = (
  result: EdenResult<any, EdenFetchError>,
  params: EdenRequestParams,
) => MaybePromise<EdenResult<any, EdenFetchError> | Nullish>

/**
 * Global/general settings that influence the behavior of the resolver.
 */
export interface EdenResolverConfig<T extends AnyElysia = AnyElysia> {
  /**
   * Global query parameters for requests.
   */
  query?: Record<string, any>

  /**
   * Global fetch options that are merged with request-specific options before being
   * passed to {@link EdenResolverConfig.fetcher}.
   */
  fetch?: Omit<RequestInit, 'headers' | 'method'>

  /**
   * Ponyfill for fetch.
   *
   * Feature is available in both tRPC and eden (official).
   *
   * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L29
   * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L164
   */
  fetcher?: FetchEsque

  headers?: EdenRequestHeaders

  onRequest?: MaybeArray<EdenRequestTransformer>

  onResponse?: MaybeArray<EdenResponseTransformer>

  onResult?: MaybeArray<EdenResultTransformer>

  /**
   * Whether to dynamically resolve the domain.
   *
   * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L477
   */
  keepDomain?: boolean

  /**
   * Either an origin or the Elysia.js application.
   */
  domain?: T | string

  /**
   * Transformer for request body.
   *
   * Unlike tRPC, eden-query does not perform strict checking on whether a transformer
   * is present on both the client and server. So this is a looser interpretation of `TransformerOptions`.
   *
   * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/internals/transformer.ts#L37
   */
  transformer?: DataTransformerOptions

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
