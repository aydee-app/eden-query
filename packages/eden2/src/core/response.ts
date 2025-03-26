/**
 * Roughly correlates to tRPC responses.
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L73-L83
 *
 * The main difference is that {@link EdenErrorResponse} does not conform to any shape
 * since this library does not provide any wrapping around the errors returned from the server.
 *
 * i.e. If your endpoint returns a string as an error, this library will give you the returned string.
 */

import { parseStringifiedValue } from '../utils/parse'

/**
 * @template T The data that is returned from a successful response.
 */
export interface EdenSuccessResponse<T> {
  data: T
  error: null
  response: Response
}

/**
 * @template T The data that is returned from an unsuccessful response.
 */
export interface EdenErrorResponse<T> {
  data: null
  error: T
  response: Response
}

/**
 * Untyped eden-treaty response. Will either return nullish data and defined error, or vice versa.
 * Look at concrete implementation of eden-treaty for strongly-typed variant.
 *
 * @template TData The data that is returned from a successul response.
 * @template TError The data that is returned from an unsuccessful response.
 */
export type EdenResponse<TData = unknown, TError = unknown> =
  | EdenSuccessResponse<TData>
  | EdenErrorResponse<TError>

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

export async function* streamResponse(response: ResponseEsque) {
  const body = response.body

  if (!body?.getReader) return

  const reader = body.getReader()

  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const data = decoder.decode(value)

      yield parseStringifiedValue(data)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 */
export async function getResponseData(response: Response) {
  switch (response.headers.get('Content-Type')?.split(';')[0]) {
    case 'text/event-stream': {
      return streamResponse(response)
    }

    case 'application/json': {
      return await response.json()
    }

    case 'application/octet-stream': {
      return await response.arrayBuffer()
    }

    case 'multipart/form-data': {
      const formData = await response.formData()
      return Object.fromEntries(formData.entries())
    }

    default: {
      return await response.text().then(parseStringifiedValue)
    }
  }
}
