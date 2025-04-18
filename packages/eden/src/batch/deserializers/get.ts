import type { EdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
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
>(context: InternalContext, _config?: BatchDeserializerConfig) {
  const options: Array<EdenRequestOptions> = []

  const request = context.request

  const url = new URL(request.url)

  const searchParams = url.searchParams.entries()

  /**
   * Headers that do not start with `${number}.` will be added to headers for all requests.
   */
  const globalHeaders: any = {}

  /**
   * Query parameters that do not start with `${number}.` will be added to query for all requests.
   */
  const globalQuery: any = {}

  for (const [key, value] of searchParams) {
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
    const [maybeIndex, property, ...queryKey] = key.split('.')

    const index = Number(maybeIndex)

    // If first item is not a numeric index, then apply the raw key and value to all request queries.
    if (Number.isNaN(index)) {
      globalQuery[key] = value
      continue
    }

    // If the first item is a numeric index, try to map it to a request property.
    switch (property) {
      case BODY_KEYS.query: {
        // Join the remaining entries to accommodate query keys with dots.
        const fullQueryKey = queryKey.join('.')

        options[index] ??= {}
        options[index].input ??= {}
        options[index].input.query ??= {}
        options[index].input.query[fullQueryKey] = value

        continue
      }

      case BODY_KEYS.path: {
        options[index] ??= {}
        options[index].path = value

        continue
      }

      default: {
        continue
      }
    }
  }

  // Array items are added based on index, but may be out of order or contain missing items.
  // TODO: handle missing items, i.e. holes, in the array.

  for (const [key, value] of request.headers) {
    const [maybeIndex = '', name] = key.split('.')

    const index = Number(maybeIndex)

    // If the header does not start with a numeric index, or no name was found for the header,
    // apply the header to all requests.

    if (Number.isNaN(index) || !name) {
      globalHeaders[key] = value
      continue
    }

    options[index] ??= {}
    options[index].input ??= {}
    options[index].input.headers ??= {}
    ;(options[index].input.headers as any)[name] = value
  }

  for (const key in globalHeaders) {
    // Some headers from the batch request should not be forwarded to the individual requests.
    // For example, "content-length" describes the size of the batch request, not the individual request.
    if (IGNORED_HEADERS.includes(key.toLowerCase())) continue

    for (const result of options) {
      result.headers ??= {}
      ;(result.headers as any)[key] = globalHeaders[key]
    }
  }

  for (const key in globalQuery) {
    for (const result of options) {
      result.query ??= {}
      result.query[key] = globalQuery[key]
    }
  }

  return options as Array<EdenRequestOptions<TElysia, TConfig>>
}
