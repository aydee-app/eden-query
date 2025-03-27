import type { EdenRequestParams } from '../../core/request'

/**
 * Get the parameters for a batch GET request.
 *
 * If using GET request to batch, the request data will be encoded in query parameters.
 * This is only possible if all requests are GET requests.
 *
 * The query will look like this
 *
 * // GET request to /api/b?name=elysia, i.e. query of name=elysia
 *
 * batch=1&0.path=/api/b&0.method=GET&0.query.name=elysia
 */
export async function parametizeBatchGet(batchParams: EdenRequestParams[]) {
  const query: Record<string, any> = {}

  const headers = new Headers()

  const parametizerOperations = batchParams.map(async (params, index) => {
    let path = params.path ?? ''

    // Handle path params.
    for (const key in params.options?.params) {
      const placeholder = `:${key}`

      const param = params.options.params[key as never]

      if (param != null) {
        path = path.replace(placeholder, param)
      }
    }

    query[`${index}.path`] = path

    for (const key in params.options?.query) {
      const value = params.options.query[key as never]

      if (value != null) {
        query[`${index}.query.${key}`] = value
      }
    }

    // Handle headers.

    /**
     * These headers may be set at the root of the client as defaults.
     */
    const defaultHeaders =
      typeof params.headers === 'function' ? await params.headers(params) : params.headers

    /**
     * These headers are set on this specific request.
     */
    const requestHeaders = params.options?.headers

    const resolvedHeaders = { ...defaultHeaders, ...requestHeaders }

    for (const key in resolvedHeaders) {
      const header = resolvedHeaders[key as never]

      if (header != null) {
        headers.append(key, header)
      }
    }
  })

  await Promise.all(parametizerOperations)

  return { body: null, query, headers }
}
