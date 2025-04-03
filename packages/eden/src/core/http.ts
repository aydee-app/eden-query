import type { CallbackOrValue } from '../utils/callback-or-value'
import type { MaybeArray, MaybePromise, Nullish, Prettify, Range } from '../utils/types'

/**
 * Informational responses (100 – 199)
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
 */
export type HttpInformationalStatus = Range<100, 200>

/**
 * Successful responses (200 – 299)
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
 */
export type HttpSuccessStatus = Range<200, 300>

/**
 * Redirection messages (300 – 399)
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
 */
export type HttpRedirectionStatus = Range<300, 400>

/**
 * Client error responses (400 – 499)
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
 */
export type HttpClientErrorStatus = Range<400, 500>

/**
 * Server error responses (500 – 599)
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
 */
export type HttpServerErrorStatus = Range<500, 600>

export type HttpNonErrorStatus = Prettify<
  HttpInformationalStatus | HttpSuccessStatus | HttpRedirectionStatus
>

export interface HeadersInitEsque {
  [Symbol.iterator](): IterableIterator<[string, string]>
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L42
 */
export type HTTPHeaders =
  | HeadersInitEsque
  | Record<string, string[] | string | Nullish>
  | Array<[string, string]>
  | [string, string]
  // Technically not a valid header, but specified here to since `toArray` includes it in the resulting type...
  | string

export type HeadersEsque<T extends any[] = []> = MaybeArray<
  CallbackOrValue<MaybePromise<HTTPHeaders | Nullish>, T>
>

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
) => Promise<Response> | Response

/**
 * A subset of the standard ReadableStream properties needed by tRPC internally.
 * @see ReadableStream from lib.dom.d.ts
 */
export type WebReadableStreamEsque = {
  getReader: () => ReadableStreamDefaultReader<Uint8Array>
}

export type NodeJSReadableStreamEsque = {
  on(eventName: string | symbol, listener: (...args: any[]) => void): NodeJSReadableStreamEsque
  getReader?: undefined
}

/**
 * A subset of the standard Response properties needed by tRPC internally.
 * @see Response from lib.dom.d.ts
 *
 * @remarks
 * This interpretation of a Response object does not really work with Eden or Elysia.js
 * with its REST-based conventions. Eden client will use a majority of the Response object,
 * so declaring a subset is not helpful.
 */
export interface ResponseEsque {
  readonly body?: NodeJSReadableStreamEsque | WebReadableStreamEsque | null
  /**
   * @remarks
   * The built-in Response::json() method returns Promise<any>, but
   * that's not as type-safe as unknown. We use unknown because we're
   * more type-safe. You do want more type safety, right? 😉
   */
  json(): Promise<unknown>
}
