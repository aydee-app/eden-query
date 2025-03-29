import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenRequestParams } from './request'

interface HeadersInitEsque {
  [Symbol.iterator](): IterableIterator<[string, string]>
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L42
 */
export type HTTPHeaders =
  | HeadersInitEsque
  | Record<string, string[] | string | Nullish>
  | Array<[string, string]>

export type EdenRequestHeadersResolver = (
  params: EdenRequestParams,
) => MaybePromise<HTTPHeaders | Nullish>

export type EdenRequestHeaders = MaybeArray<HTTPHeaders | EdenRequestHeadersResolver>

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * @param edenRequestHeaders The input headers to resolve, a superset of regular request headers.
 * @param fetchInit The options that the fetch function will be called with.
 * @param params The raw, original argument passed to the resolver function.
 * @param [headers={}] The currently accumulated headers result.
 */
export async function processHeaders(
  edenRequestHeaders: EdenRequestHeaders | Nullish,
  fetchInit: RequestInit = {},
  params: EdenRequestParams = {},
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (!edenRequestHeaders) return headers

  if (Array.isArray(edenRequestHeaders)) {
    if (edenRequestHeaders.length === 2 && edenRequestHeaders.every(isString)) {
      const [key, value] = edenRequestHeaders as [string, string]
      headers[key.toLowerCase()] = value
    } else {
      for (const value of edenRequestHeaders) {
        headers = await processHeaders(value as any, fetchInit, params, headers)
      }
    }
    return headers
  }

  switch (typeof edenRequestHeaders) {
    case 'function': {
      const v = await edenRequestHeaders(params)

      if (v) {
        return await processHeaders(v, fetchInit, params, headers)
      }

      return headers
    }

    case 'object': {
      if (edenRequestHeaders instanceof Headers) {
        edenRequestHeaders.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })

        return headers
      }

      for (const [key, value] of Object.entries(edenRequestHeaders)) {
        headers[key.toLowerCase()] = value as string
      }

      return headers
    }

    default: {
      return headers
    }
  }
}
