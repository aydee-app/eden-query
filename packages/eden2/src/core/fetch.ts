import type { ResponseEsque } from './response'

/**
 * A subset of the standard RequestInit properties needed by tRPC internally.
 * @see RequestInit from lib.dom.d.ts
 * @remarks
 * If you need a property that you know exists but doesn't exist on this
 * interface, go ahead and add it.
 */
export interface RequestInitEsque {
  /**
   * Sets the request's body.
   */
  body?: FormData | string | null | Uint8Array | Blob | File

  /**
   * Sets the request's associated headers.
   */
  headers?: [string, string][] | Record<string, string>

  /**
   * The request's HTTP-style method.
   */
  method?: string

  /**
   * Sets the request's signal.
   */
  signal?: AbortSignal | undefined
}

/**
 * A subset of the standard fetch function type needed by tRPC internally.
 * @see fetch from lib.dom.d.ts
 * @remarks
 * If you need a property that you know exists but doesn't exist on this
 * interface, go ahead and add it.
 */
export type FetchEsque = (
  input: RequestInfo | URL | string,
  init?: RequestInit | RequestInitEsque,
) => Promise<Response>

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
