import type { AnyElysia } from 'elysia'

import type { DataTransformerOptions } from '../trpc/server/transformer'
import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenFetchError } from './errors'
import type { EdenRequestHeaders } from './headers'
import type { EdenRequestParams } from './request'
import type { EdenResult } from './response'

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
  query?: Record<string, any>

  fetch?: Omit<RequestInit, 'headers' | 'method'>

  fetcher?: typeof fetch

  headers?: EdenRequestHeaders

  onRequest?: MaybeArray<EdenRequestTransformer>

  onResponse?: MaybeArray<EdenResponseTransformer>

  onResult?: MaybeArray<EdenResultTransformer>

  keepDomain?: boolean

  /**
   */
  domain?: T | string

  transformer?: DataTransformerOptions
}
