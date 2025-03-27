import type { AnyElysia } from 'elysia'

import { BATCH_ENDPOINT } from '../../constants'
import type { EdenFetchError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import { resolveEdenRequest } from '../../core/resolve'
import type { EdenResponse } from '../../core/response'
import { Observable } from '../../observable'
import { getTransformer } from '../../trpc/client/transformer'
import { handleHttpRequest, type HTTPLinkOptions } from '../http-link'
import type { Operation } from '../internal/operation'
import type { OperationLink } from '../internal/operation-link'
import { type BatchLoader, dataLoader } from './data-loader'
import { parametizeBatchGet } from './parametizers/get'
import { parametizeBatchPost } from './parametizers/post'

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

const batchParametizers = {
  GET: parametizeBatchGet,
  POST: parametizeBatchPost,
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

      const params = parametizeBatchGet(batchOps)

      const searchParams = new URLSearchParams(params.query)

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

      // If any requests are POST, then the entire batch request must be POST.
      // Otherwise, default to user-provided method and fallback to POST.
      const method =
        (batchOps.find((op) => op.params.method === 'POST') && 'POST') || options.method || 'POST'

      const parametize = batchParametizers[method]

      const params = parametize(batchOps)

      const resolvedParams: EdenRequestParams = {
        ...options,
        method,
        options: { query: params.query },
        body: params.body,
        headers: params.headers,
      }

      const result = await resolveEdenRequest(resolvedParams)

      /**
       * result.data should be an array of JSON data from each request in the batch.
       */
      if (!('data' in result) || !Array.isArray(result.data)) {
        return []
      }

      const resolvedTransformer = getTransformer(options)

      const batchedData: EdenResponse<any, EdenFetchError>[] = result.data

      /**
       * The batch plugin also encodes its data into a JSON.
       *
       * @example
       * If the data from a batched request is [3, 'OK', false],
       * the batch plugin should return a JSON like
       * [
       *   { data: 3, error: null, status: 200, statusText: 'OK' },
       *   { data: 'OK', error: null, status: 200, statusText: 'OK' }
       *   { data: false, error: null, status: 200, statusText: 'OK' }
       * ]
       */
      const transformedResponses = batchedData.map((batchedResult, index) => {
        // The raw data from each request has not be de-serialized yet.
        // De-serialize it so every entry is the finalized result.
        if (resolvedTransformer != null && batchedResult.data != null) {
          batchedResult.data = resolvedTransformer.output.deserialize(batchedResult.data)
        }

        const operation = batchOps[index]

        // If this specific operation wanted the raw information, append the required properties.
        if (operation?.params.raw) {
          // Recreate custom headers object.
          const headers = new Headers()

          /**
           * If the header value has a numeric prefix, only assign it if it matches the operation index,
           * otherwise, assign it.
           *
           * The batch plugin will add a numeric prefix to organize the headers.
           *
           * @example
           * '0.set-cookie': 'abc' should be a header only for request 0.
           * 'set-cookie': should be a header for all the batched requests.
           */
          result.response.headers.forEach((value, key) => {
            const [prefix, name] = key.split('.')

            if (Number(prefix) === index && name != null) {
              headers.set(name, value)
            } else {
              headers.set(key, value)
            }
          })

          /**
           * TODO: how to guarantee that this value is the correct body?
           */
          const body =
            resolvedTransformer != null
              ? resolvedTransformer.output.serialize(batchedResult.data)
              : JSON.stringify(batchedResult.data)

          /**
           * Create a new response using the re-serialized body.
           */
          const response = new Response(body, {
            status: batchedResult.response.status,
            statusText: batchedResult.response.statusText,
            headers,
          })

          batchedResult.response = response
        }

        return batchedResult
      })

      return transformedResponses
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
