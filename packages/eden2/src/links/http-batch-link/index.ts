import type { AnyElysia } from 'elysia'

import { serializeBatchGetParams } from '../../batch/serializer/get'
import { serializeBatchPostParams } from '../../batch/serializer/post'
import { BATCH_ENDPOINT } from '../../constants'
import type { EdenFetchError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import { defaultOnResult, resolveEdenRequest } from '../../core/resolve'
import type { EdenResult } from '../../core/response'
import { Observable } from '../../observable'
import { toArray } from '../../utils/to-array'
import { handleHttpRequest, type HTTPLinkOptions, resolveHttpOperationParams } from '../http-link'
import type { Operation } from '../internal/operation'
import type { OperationLink } from '../internal/operation-link'
import { type BatchLoader, dataLoader } from './data-loader'

export type BatchMethod = 'GET' | 'POST'

export type HTTPBatchLinkOptions<T = any> = HTTPLinkOptions<T> & {
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

const batchSerializer = {
  GET: serializeBatchGetParams,
  POST: serializeBatchPostParams,
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

  const edenParamsResolver = resolveHttpOperationParams.bind(null, options)

  const batchLoader: BatchLoader<Operation, EdenResult<any, EdenFetchError>> = {
    async validate(batchOps) {
      // If not a GET request, then we don't care about size limits.
      if (options.method !== 'GET') return true

      // Quick calculation.
      if (maxURLLength === Infinity && maxItems === Infinity) return true

      if (batchOps.length > maxItems) return false

      const params = await serializeBatchGetParams(batchOps)

      const searchParams = new URLSearchParams(params.query)

      const url = `${endpoint}${searchParams.size ? '?' : ''}${searchParams}`

      return url.length <= maxURLLength
    },
    async fetch(batchOps) {
      if (batchOps.length === 1) {
        const [firstOperation] = batchOps

        if (firstOperation != null) {
          const result = await handleHttpRequest(options, firstOperation)
          return [result]
        }
      }

      const postRequest = batchOps.find((op) => op.params?.method?.toUpperCase() === 'POST')

      const method = (postRequest && 'POST') || options.method || 'POST'

      const resolvedBatchOps = batchOps.map(edenParamsResolver)

      const resolvedBatchParams = await batchSerializer[method](resolvedBatchOps)

      const resolvedParams: EdenRequestParams = {
        ...options,
        // Batch requests either use FormData (POST) or URL query (GET), no transformer needed.
        transformer: undefined,
        path: endpoint,
        method,
        options: {
          query: {
            ...options.query,
            ...resolvedBatchParams.query,
          },
        },
        body: resolvedBatchParams.body,
        headers: resolvedBatchParams.headers,
      }

      const result = await resolveEdenRequest(resolvedParams)

      if (!Array.isArray(result.data)) return []

      const batchedData: EdenResult<any, EdenFetchError>[] = result.data

      const resultOperations = batchedData.map(async (batchedResult, index) => {
        let result = batchedResult

        const op = resolvedBatchOps[index]

        if (op == null) return batchedResult

        const onResult = [...toArray(op?.onResult), defaultOnResult]

        for (const handler of onResult) {
          const newResult = await handler(result, op)
          result = newResult || result
        }

        return result
      })

      const results = await Promise.all(resultOperations)

      return results
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

        loader
          .load(op)
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
