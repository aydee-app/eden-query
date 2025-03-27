import type { AnyElysia } from 'elysia'

import { BATCH_ENDPOINT } from '../../constants'
import type { EdenFetchError } from '../../core/errors'
import type { EdenResponse } from '../../core/response'
import { Observable } from '../../observable'
import { handleHttpRequest, type HTTPLinkOptions } from '../http-link'
import type { Operation } from '../internal/operation'
import type { OperationLink } from '../internal/operation-link'
import { type BatchLoader,dataLoader } from './data-loader'

export type BatchMethod = 'GET' | 'POST'

export type HTTPBatchLinkOptions<T> = HTTPLinkOptions<T> & {
  /**
   * Path for the batch endpoint.
   *
   * @example /batch
   */
  endpoint?: string

  /**
   * Configure the maximum URL length if making batch requests with GET.
   */
  maxURLLength?: number

  /**
   * Maximum number of calls in a single batch request
   * @default Infinity
   */
  maxItems?: number

  method?: BatchMethod
}

/**
 * If using GET request to batch, the request data will be encoded in query parameters.
 * This is only possible if all requests are GET requests.
 *
 * The query will look like this
 *
 * // GET request to /api/b?name=elysia, i.e. query of name=elysia
 *
 * batch=1&0.path=/api/b&0.method=GET&0.query.name=elysia
 */
export function generateGetBatchRequestInformation(operations: Operation[]) {
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

/**
 * @see https://trpc.io/docs/client/links/httpLink
 */
export function httpBatchLink<T extends AnyElysia = AnyElysia>(
  options: HTTPBatchLinkOptions<T> = {},
) {
  const maxURLLength = options.maxURLLength ?? Infinity
  const maxItems = options.maxItems ?? Infinity
  const endpoint = options.endpoint ?? BATCH_ENDPOINT

  const batchLoader: BatchLoader<Operation, EdenResponse<any, EdenFetchError>> = {
    validate(batchOps) {
      // If not a GET request, then we don't care about size limits.
      if (options.method !== 'GET') return true

      // Quick calculation.
      if (maxURLLength === Infinity && maxItems === Infinity) return true

      if (batchOps.length > maxItems) return false

      const requestInformation = generateGetBatchRequestInformation(batchOps)

      const searchParams = new URLSearchParams(requestInformation.query)

      const url = `${endpoint}${searchParams.size ? '?' : ''}${searchParams}`

      return url.length <= maxURLLength
    },
    async fetch(batchOps) {
      // If there is only one request, make a regular HTTP request.
      if (batchOps.length === 1) {
        const [firstOperation] = batchOps

        if (firstOperation != null) {
          const result = await handleHttpRequest(options, firstOperation)
          return [result]
        }
      }

      // TODO: Make a request to the batch endpoint.
      return []
    },
  }

  const loader = dataLoader(batchLoader)

  const link = () => {
    const operationLink: OperationLink<T> = ({ op }) => {
      return new Observable((observer) => {
        if (op.type === 'subscription') {
          throw new Error(
            'Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`',
          )
        }

        const promise = loader.load(op)

        promise
          .then((response) => {
            if (response.error) {
              observer.error(response.error)
            } else {
              observer.next({ result: response, context: op.context })
              observer.complete()
            }
          })
          .catch((err) => {
            observer.error(err)
          })
      })
    }

    return operationLink
  }

  return link
}
