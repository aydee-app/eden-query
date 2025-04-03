import type { EdenRequestParams } from '../../core/config'
import { processHeaders } from '../../core/headers'
import type { InternalElysia, TypeConfig } from '../../core/types'

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
export async function serializeBatchGetParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(batchParams: EdenRequestParams<TElysia, TConfig>[]) {
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

    const currentHeaders = await processHeaders(params.headers, params)

    const resolvedHeaders = { ...currentHeaders, ...params.options?.headers }

    for (const key in resolvedHeaders) {
      const value = currentHeaders[key as keyof typeof currentHeaders]

      if (value) {
        headers.append(`${index}.headers.${key}`, value)
      }
    }
  })

  await Promise.all(parametizerOperations)

  return { body: null, query, headers }
}
