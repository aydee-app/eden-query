import type { MaybeArray, MaybePromise } from '../utils/types'
import type { EdenRequestHeaders } from './headers'

export type EdenRequestTransformer = (
  path: string,
  options: RequestInit,
) => MaybePromise<RequestInit | void>

export type EdenResponseTransformer = (response: Response) => MaybePromise<unknown>

/**
 * Global/general settings that influence the behavior of the resolver.
 */
export interface EdenResolverConfig {
  fetch?: Omit<RequestInit, 'headers' | 'method'>

  fetcher?: typeof fetch

  headers?: EdenRequestHeaders

  onRequest?: MaybeArray<EdenRequestTransformer>

  onResponse?: MaybeArray<EdenResponseTransformer>

  keepDomain?: boolean
}
