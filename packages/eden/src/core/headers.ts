import type { HeadersEsque } from './http'

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * @param headersEsque The input headers to resolve, a superset of regular request headers.
 * @param fetchInit The options that the fetch function will be called with.
 * @param params The raw, original argument passed to the resolver function.
 * @param [headers={}] The currently accumulated headers result.
 */
export async function processHeaders<T = any>(
  headersEsque: HeadersEsque<[T]>,
  params: T = {} as any,
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (!headersEsque) return headers

  // [key, value] tuple.
  if (Array.isArray(headersEsque) && headersEsque.length === 2 && headersEsque.every(isString)) {
    const [key, value] = headersEsque

    if (key && value) {
      headers[key.toString()] = value.toString()
    }

    return headers
  }

  // Need to lower arrays in order to prevent infinite loop.
  if (Array.isArray(headersEsque)) {
    for (const value of headersEsque) {
      headers = await processHeaders(value as any, params, headers)
    }

    return headers
  }

  switch (typeof headersEsque) {
    case 'function': {
      const v = await headersEsque(params)

      if (v) {
        return await processHeaders(v, params, headers)
      }

      return headers
    }

    case 'object': {
      if (headersEsque instanceof Headers) {
        headersEsque.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })

        return headers
      }

      for (const [key, value] of Object.entries(headersEsque)) {
        headers[key.toLowerCase()] = value as string
      }

      return headers
    }

    case 'string': // falls through

    default: {
      return headers
    }
  }
}
