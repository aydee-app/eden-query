import { serializeBatchGetParams } from '../../batch/serializer/get'
import { serializeBatchPostParams } from '../../batch/serializer/post'
import type { BatchMethod } from '../../batch/shared'
import { BATCH_ENDPOINT, EDEN_STATE_KEY } from '../../constants'
import type { EdenFetchError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import { defaultOnResult, resolveEdenRequest } from '../../core/resolve'
import type { EdenResult } from '../../core/response'
import type { InternalElysia } from '../../elysia'
import { Observable } from '../../observable'
import { toArray } from '../../utils/to-array'
import type { TypeError } from '../../utils/types'
import { handleHttpRequest, type HTTPLinkOptions, resolveHttpOperationParams } from '../http-link'
import type { EdenLink } from '../internal/eden-link'
import type { Operation } from '../internal/operation'
import type { OperationLink } from '../internal/operation-link'
import { type BatchLoader, dataLoader } from './data-loader'

export type BatchingNotDetectedError =
  TypeError<'Batch plugin not detected on Elysia.js server application'>

export type ConfigWithBatching = { batch: any }

/**
 * @template TKey A unique key to index the server application state to try to find a transformer configuration.
 *   Possible values:
 *   - falsy: disable type checking, and it is completely optional.
 *   - true: shorthand for "eden" or {@link EDEN_STATE_KEY}. Extract the config from {@link Elysia.store.eden}.
 *   - PropertyKey: any valid property key will be used to index {@link Elysia.store}.
 *
 *   Defaults to undefined, indicating to turn type-checking off.
 */
export type HTTPBatchLinkOptions<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
> = HTTPLinkOptions<TElysia, TKey> & {
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
 *
 * Tried to extrapolate return type but was not able to get correct inference
 * when inside of object errors. e.g. If {@link TConfig} itself contained an array,
 * then introspection would fail...
 */
export function httpBatchLink<
  TElysia extends InternalElysia,
  TConfig extends HTTPBatchLinkOptions<TElysia, TConfig['key']>,
>(
  options: TConfig = {} as any,
): TConfig['key'] extends PropertyKey
  ? ConfigWithBatching extends TElysia['store'][Extract<TConfig['key'], keyof TElysia['store']>]
    ? EdenLink<TElysia>
    : BatchingNotDetectedError
  : TConfig['key'] extends true
    ? TElysia['store'][typeof EDEN_STATE_KEY] extends ConfigWithBatching
      ? EdenLink<TElysia>
      : BatchingNotDetectedError
    : EdenLink<TElysia> {
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

      const resolvedBatchOps = await Promise.all(batchOps.map(edenParamsResolver))

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

  const link = (() => {
    const operationLink: OperationLink<TElysia> = ({ op }) => {
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
  }) satisfies EdenLink<TElysia>

  return link as any
}
