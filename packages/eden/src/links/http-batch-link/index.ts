import { jsonlStreamConsumer } from '@trpc/server/unstable-core-do-not-import'

import { serializeBatchGetParams } from '../../batch/serializers/get'
import { serializeBatchPostParams } from '../../batch/serializers/post'
import type { BatchMethod } from '../../batch/shared'
import { BATCH_ENDPOINT, type EDEN_STATE_KEY, HTTP_SUBSCRIPTION_ERROR } from '../../constants'
import type { EdenRequestParams } from '../../core/config'
import type { EdenResult } from '../../core/dto'
import type { EdenError } from '../../core/error'
import { defaultOnResult, resolveEdenRequest } from '../../core/resolve'
import type { InternalElysia, TypeConfig } from '../../core/types'
import { Observable } from '../../observable'
import { toArray } from '../../utils/array'
import { linkAbortSignals, raceAbortSignals } from '../../utils/signal'
import type { TypeError } from '../../utils/types'
import {
  handleHttpRequest,
  type HTTPLinkBaseOptions,
  resolveHttpOperationParams,
} from '../http-link'
import type { EdenLink, Operation, OperationLink } from '../types'
import { type BatchLoader, dataLoader } from './data-loader'

export type BatchingNotDetectedError =
  TypeError<'Batch plugin not detected on Elysia.js server application'>

export type ConfigWithBatching = { batch: any }

/**
 * @see https://github.com/trpc/trpc/blob/f6efa479190996c22bc1e541fdb1ad6a9c06f5b1/packages/client/src/links/HTTPBatchLinkOptions.ts#L6
 */
export type HTTPBatchLinkOptions<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = HTTPLinkBaseOptions<TElysia, TConfig> & {
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
   *
   * @default Infinity
   */
  maxItems?: number

  /**
   * Specify a default method for all batch requests.
   *
   * @default "POST"
   */
  method?: BatchMethod
}

const batchSerializers = {
  GET: serializeBatchGetParams,
  POST: serializeBatchPostParams,
}

export type HTTPBatchLinkResult<
  TElysia extends InternalElysia,
  TConfig extends HTTPBatchLinkOptions<any, any>,
> = TConfig['types'] extends PropertyKey
  ? ConfigWithBatching extends TElysia['store'][Extract<TConfig['types'], keyof TElysia['store']>]
    ? EdenLink<TElysia>
    : BatchingNotDetectedError
  : TConfig['types'] extends true
    ? TElysia['store'][typeof EDEN_STATE_KEY] extends ConfigWithBatching
      ? EdenLink<TElysia>
      : BatchingNotDetectedError
    : EdenLink<TElysia>

/**
 */
async function resolveBatchJson(result: EdenResult, ops: EdenRequestParams[]) {
  if (!Array.isArray(result.data)) return []

  const batchedData: EdenResult[] = result.data

  const resultOperations = batchedData.map(async (batchedResult, index) => {
    let result = batchedResult

    const op = ops[index]

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
}

/**
 */
async function resolveBatchStream(result: EdenResult, ops: EdenRequestParams[]) {
  if (result.type !== 'data' || !result.response.body) return []

  const abortController = new AbortController()

  const [head] = await jsonlStreamConsumer<Record<string, Promise<any>>>({
    from: result.response.body,
    abortController,
  })

  const resultOperations = ops.map(async (batchedResult, index) => {
    let result = await Promise.resolve(head[index])

    const op = ops[index]

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
  const TConfig extends HTTPBatchLinkOptions<TElysia, TConfig['types']>,
>(options: TConfig = {} as any): HTTPBatchLinkResult<TElysia, TConfig> {
  const maxURLLength = options.maxURLLength ?? Infinity

  const maxItems = options.maxItems ?? Infinity

  const endpoint = options.endpoint ?? BATCH_ENDPOINT

  const edenParamsResolver = (op: Operation) => resolveHttpOperationParams(options, op)

  const batchLoader: BatchLoader<Operation, EdenResult<any, EdenError>> = {
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

      const serializer = batchSerializers[method]

      const resolvedBatchParams = await serializer(resolvedBatchOps)

      const resolvedParams = {
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
      } as EdenRequestParams

      const batchSignals = batchOps.map((op) => op.signal)

      if (batchSignals.length) {
        const linkedBatchSignals = linkAbortSignals(...batchSignals)

        const abortController = new AbortController()

        const signal = raceAbortSignals(linkedBatchSignals, abortController.signal)

        resolvedParams.fetch = { ...resolvedParams.fetch, signal: signal }
      }

      const result = await resolveEdenRequest(resolvedParams)

      if (result.type !== 'data') return []

      const contentType = result.response.headers.get('content-type')

      const resolver = contentType?.includes('event-stream') ? resolveBatchStream : resolveBatchJson

      const results = resolver(result, resolvedBatchOps)

      return results
    },
  }

  const loader = dataLoader(batchLoader)

  const link = (() => {
    const operationLink: OperationLink<TElysia> = ({ op }) => {
      return new Observable((observer) => {
        if (op.type === 'subscription') throw new Error(HTTP_SUBSCRIPTION_ERROR)

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
