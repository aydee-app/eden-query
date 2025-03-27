import { getTransformer } from '../../../trpc/client/transformer'
import type { Operation } from '../../internal/operation'

/**
 * If using POST request to batch, most of the request data will be encoded in the FormData body.
 *
 * It will look like this:
 *
 * {
 *   // POST request to /api/a with a JSON body of { value: 0 }
 *
 *   '0.path': '/api/a',
 *   '0.method': 'POST',
 *   '0.body_type': 'JSON',
 *   '0.body': '{ value: 0 }'
 *
 *   // GET request to /api/b?name=elysia, i.e. query of name=elysia
 *
 *   '1.path': '/api/b',
 *   '1.method': 'GET',
 *   '1.query.name': 'elysia'
 * }
 */
export function parametizeBatchPost(operations: Operation[]) {
  const body = new FormData()

  const headers = new Headers()

  operations.forEach((operation, index) => {
    let operationPath = operation.params.path ?? ''

    // Specify method of the request.
    if (operation.params.method != null) {
      body.append(`${index}.method`, operation.params.method)
    }

    // Handle path parameters.
    for (const key in operation.params.options?.params) {
      const placeholder = `:${key}`
      const param = operation.params.options.params[key as never]
      if (param != null) {
        operationPath = operationPath.replace(placeholder, param)
      }
    }

    // Specify the path of the request.
    body.append(`${index}.path`, operationPath)

    // Handle query parameters.
    for (const key in operation.params.options?.query) {
      const value = operation.params.options.query[key as never]

      if (value != null) {
        body.append(`${index}.query.${key}`, value)
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

    // Handle body.

    if (operation.params?.body == null) return

    const transformer = getTransformer(operation.params)

    // Intermediary variable so TypeScript can coerce the type properly.
    const paramsBody = operation.params.body

    if (paramsBody instanceof FormData) {
      body.append(`${index}.body_type`, 'formdata')

      paramsBody.forEach((value, key) => {
        const serialized = transformer.input.serialize(value)

        // FormData is special and can handle additional data types, like Files.
        // So we will not JSON.stringify the serialized result.
        body.set(`${index}.body.${key}`, serialized)
      })
    } else {
      body.append(`${index}.body_type`, 'json')

      const serialized = transformer.input.serialize(operation.params.body)
      const stringified = JSON.stringify(serialized)

      body.set(`${index}.body`, stringified)
    }
  })

  return { body, query: {}, headers }
}
