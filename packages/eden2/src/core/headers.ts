import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenRequestParams } from './request'

interface HeadersInitEsque {
  [Symbol.iterator](): IterableIterator<[string, string]>
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L42
 */
export type HTTPHeaders = HeadersInitEsque | Record<string, string[] | string | Nullish>

export type EdenRequestHeadersResolver = (
  params: EdenRequestParams,
) => MaybePromise<HTTPHeaders | Nullish>

export type EdenRequestHeaders = MaybeArray<HTTPHeaders | EdenRequestHeadersResolver>

/**
 * @param edenRequestHeaders The input headers to resolve, a superset of regular request headers.
 * @param fetchInit The options that the fetch function will be called with.
 * @param params The raw, original argument passed to the resolver function.
 * @param [headers={}] The currently accumulated headers result.
 */
export async function processHeaders(
  edenRequestHeaders: EdenRequestHeaders | Nullish,
  fetchInit: RequestInit = {},
  params: EdenRequestParams,
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (Array.isArray(edenRequestHeaders)) {
    for (const value of edenRequestHeaders) {
      if (!Array.isArray(value)) {
        headers = await processHeaders(value, fetchInit, params, headers)
        continue
      }

      const key = value[0]

      if (typeof key === 'string') {
        headers[key.toLowerCase()] = value[1] as string
        continue
      }

      for (const [k, value] of key) {
        if (k) {
          headers[k.toLowerCase()] = value as string
        }
      }
    }

    return headers
  }

  if (!edenRequestHeaders) return headers

  switch (typeof edenRequestHeaders) {
    case 'function': {
      if (edenRequestHeaders instanceof Headers) {
        return await processHeaders(edenRequestHeaders, fetchInit, params, headers)
      }

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
