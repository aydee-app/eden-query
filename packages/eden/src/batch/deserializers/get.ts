import type { InternalEdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import { deepMerge } from '../../utils/deep-merge'
import { BODY_KEYS, IGNORED_HEADERS } from '../shared'
import type { BatchDeserializerConfig } from './config'

/**
 * Similar logic to the batch request parser implemented by tRPC.
 *
 * @see https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/http/contentType.ts#L65
 *
 * @returns Array of options that can each be passed to the Eden request resolver.
 */
export async function deserializeBatchGetParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(context: InternalContext, config?: BatchDeserializerConfig) {
  const options: Array<InternalEdenRequestOptions> = []

  const request = context.request

  const url = new URL(request.url)

  /**
   * Headers that do not start with `${number}.` will be added to headers for all requests.
   */
  const globalHeaders = new Headers(config?.headers)

  /**
   * Query parameters that do not start with `${number}.` will be added to query for all requests.
   */
  const globalQuery = new URLSearchParams()

  url.searchParams.forEach((value, key) => {
    /**
     * @example
     *
     * value = 'value'
     *
     * ['0', 'query', 'key'] -> first request has query '?key=value'.
     * ['0', 'query', 'key', 'with', 'dots'] -> first request has query '?key.with.dots=value'.
     * ['key'] -> all requests have query '?key=value'.
     * ['key', 'with', 'dots'] -> all requests have query '?key.with.dots=value'.
     * ['0', 'path'] -> first request is for endpoint 'value'.
     */
    const [maybeIndex, property = '', ...queryKeySegments] = key.split('.')

    const index = Number(maybeIndex)

    // If first item is not a numeric index, then apply the raw key and value to all request queries.
    if (Number.isNaN(index)) {
      globalQuery.append(key, value)

      return
    }

    // If the first item is a numeric index, try to map it to a request property.
    switch (property) {
      case BODY_KEYS.query: {
        // Join the remaining entries to accommodate query keys with dots.
        const queryKey = queryKeySegments.join('.')

        options[index] = deepMerge(options[index], { input: { query: { [queryKey]: value } } })

        return
      }

      default: {
        options[index] = { ...options[index], [property]: value }
      }
    }
  })

  // Array items are added based on index, but may be out of order or contain missing items.
  // TODO: handle missing items, i.e. holes, in the array.

  for (const [key, value] of request.headers) {
    const [maybeIndex = '', ...nameSegments] = key.split('.')

    const name = nameSegments.join('.')

    const possibleHeaderNames = [key.toLowerCase(), name.toLowerCase()]

    // Some headers from the batch request should not be forwarded to the individual requests.
    // For example, "content-length" describes the size of the batch request, not the individual request.
    if (possibleHeaderNames.some((k) => IGNORED_HEADERS.includes(k))) continue

    const index = Number(maybeIndex)

    // If the header does not start with a numeric index, or no name was found for the header,
    // apply the header to all requests.

    if (Number.isNaN(index) || !name) {
      globalHeaders.append(key, value)
    } else {
      options[index] = deepMerge(options[index], { input: { headers: { [name]: value } } })
    }
  }

  if (globalHeaders.entries().toArray().length) {
    for (const result of options) {
      result.headers = new Headers([...(result.headers ?? []), ...globalHeaders])
    }
  }

  if (globalQuery.size) {
    for (const result of options) {
      result.query = new URLSearchParams([...(result.query ?? []), ...globalQuery])
    }
  }

  return options as Array<InternalEdenRequestOptions<TElysia, TConfig>>
}
