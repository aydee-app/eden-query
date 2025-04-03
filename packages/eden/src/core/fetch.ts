import type { FetchEsque, ResponseEsque } from './http'

/**
 * A simpler version of the native fetch function's type for packages with
 * their own fetch types, such as undici and node-fetch.
 */
export type NativeFetchEsque = (
  url: URL | string,
  init?: NodeFetchRequestInitEsque,
) => Promise<ResponseEsque>

export interface NodeFetchRequestInitEsque {
  body?: string
}

export function getFetch(customFetchImpl?: FetchEsque | NativeFetchEsque): FetchEsque {
  if (customFetchImpl) {
    return customFetchImpl as FetchEsque
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch as FetchEsque
  }

  if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
    return globalThis.fetch as FetchEsque
  }

  throw new Error('No fetch implementation found')
}
