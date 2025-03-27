import type { Operation } from '../../internal/operation'

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
export function parametizeBatchGet(operations: Operation[]) {
  const query: Record<string, any> = {}

  const headers = new Headers()

  operations.forEach((operation, index) => {
    let operationPath = operation.params.path ?? ''

    // Handle path params.
    for (const key in operation.params.options?.params) {
      const placeholder = `:${key}`
      const param = operation.params.options.params[key as never]
      if (param != null) {
        operationPath = operationPath.replace(placeholder, param)
      }
    }

    query[`${index}.path`] = operationPath

    if (operation.params.method != null) {
      query[`${index}.method`] = operation.params.method
    }

    for (const key in operation.params.options?.query) {
      const value = operation.params.options.query[key as never]
      if (value != null) {
        query[`${index}.query.${key}`] = value
      }
    }

    // Handle headers.

    /**
     * These headers may be set at the root of the client as defaults.
     */
    const defaultHeaders =
      typeof operation.params.headers === 'function'
        ? operation.params.headers(operationPath, operation.params.fetch)
        : operation.params.headers

    /**
     * These headers are set on this specific request.
     */
    const requestHeaders = operation.params.options?.headers

    const resolvedHeaders = { ...defaultHeaders, ...requestHeaders }

    for (const key in resolvedHeaders) {
      const header = resolvedHeaders[key as never]
      if (header != null) {
        headers.append(key, header)
      }
    }
  })

  return { body: null, query, headers }
}
