import { jsonlStreamConsumer } from '@trpc/server/unstable-core-do-not-import'

import { serializeBatchGetParams } from '../batch/serializers/get'
import { serializeBatchPostParams } from '../batch/serializers/post'
import type { BatchMethod } from '../batch/shared'
import { BATCH_ENDPOINT, HTTP_SUBSCRIPTION_ERROR } from '../constants'
import type { EdenRequestParams } from '../core/config'
import type { EdenResult } from '../core/dto'
import type { EdenError } from '../core/error'
import { processHeaders } from '../core/headers'
import type { HTTPHeaders } from '../core/http'
import { defaultOnResult, resolveEdenRequest } from '../core/resolve'
import type {
  InternalElysia,
  InternalTypeConfig,
  ResolveTypeConfig,
  TypeConfig,
} from '../core/types'
import { Observable } from '../observable'
import { toArray } from '../utils/array'
import type { CallbackOrValue } from '../utils/callback-or-value'
import { type BatchLoader, dataLoader } from '../utils/data-loader'
import { linkAbortSignals, raceAbortSignals } from '../utils/signal'
import type { MaybeArray, MaybePromise, Nullish, TypeError } from '../utils/types'
import {
  handleHttpRequest,
  type HTTPLinkBaseOptions,
  type HTTPLinkOptions,
  resolveHttpOperationParams,
} from './http-link'
import type { EdenLink, Operation, OperationLink } from './types'

export type BatchingNotDetectedError =
  TypeError<'Batch plugin not detected on Elysia.js server application'>

export type ConfigWithBatching = { batch: any }

/**
 * An extremely flexible resolver for HTTP Headers.
 *
 * Can either be the value itself, a promise of the value, a nullish value, or
 * a callback that returns any of the previously mentioned types.
 *
 * In the context of {@link httpLink}, the callback is provided with the current operation.
 */
export type HTTPBatchLinkHeaders = CallbackOrValue<
  MaybePromise<HTTPHeaders | Nullish>,
  [Operation[]]
>

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

  /**
   * Headers to be set on outgoing requests or a callback that of said headers
   * Basically like {@link EdenResolverConfig.headers} but callbacks are provided with the entire operation.
   *
   * @see http://trpc.io/docs/client/headers
   */
  headers?: MaybeArray<HTTPBatchLinkHeaders>

  /**
   * Shorthand for declaring that the batch plugin should accept the event-stream response type.
   *
   * e.g.
   *
   * ```ts
   * {
   *   // with headers
   *   headers: {
   *     'accept': 'text/event-stream',
   *   },
   *
   *   // with shortcut
   *   stream: true,
   * }
   * ```
   */
  stream?: boolean
}

const batchSerializers = {
  GET: serializeBatchGetParams,
  POST: serializeBatchPostParams,
}

export type HTTPBatchLinkResult<
  TElysia extends InternalElysia,
  TConfig extends TypeConfig,
  TResolvedConfig extends InternalTypeConfig = ResolveTypeConfig<TConfig>,
> = TResolvedConfig['key'] extends PropertyKey
  ? TElysia['store'][TResolvedConfig['key']] extends ConfigWithBatching
    ? EdenLink<TElysia>
    : BatchingNotDetectedError
  : EdenLink<TElysia>

export async function resolveBatchJson(result: EdenResult, ops: EdenRequestParams[]) {
  if (!Array.isArray(result.data)) return []

  const batchedData: EdenResult[] = result.data

  const results = batchedData.map(async (batchedResult, index) => {
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

  return results
}

export async function resolveBatchStream(result: EdenResult, ops: EdenRequestParams[]) {
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

  return resultOperations
}

export function httpBatchLink<TElysia extends InternalElysia, const TConfig>(
  options: HTTPBatchLinkOptions<TElysia, TConfig> = {} as any,
): HTTPBatchLinkResult<TElysia, TConfig> {
  const maxURLLength = options.maxURLLength ?? Infinity

  const maxItems = options.maxItems ?? Infinity

  const endpoint = options.endpoint ?? BATCH_ENDPOINT

  // Lazily evaluated, global operation headers.
  let operationHeaders = {}

  const edenParamsResolver = async (op: Operation) => {
    const headers = [operationHeaders, ...toArray(op.params.headers)]

    const params = await resolveHttpOperationParams(options, op)

    const resolvedParams = { ...params, headers }

    return resolvedParams
  }

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

        // Error case: only one operation, but it is somehow null.
        if (firstOperation == null) return []

        // Resolve the custom headers here since HTTP handling has a different shape for input headers.
        const headers = await processHeaders(options.headers, batchOps)

        if (options.stream) {
          headers['accept'] = 'text/event-stream'
        }

        const httpLinkOptions: HTTPLinkOptions<TElysia, TConfig> = { ...options, headers }

        const result = await handleHttpRequest(httpLinkOptions, firstOperation)

        return [result]
      }

      operationHeaders = await processHeaders(options.headers, batchOps)
      const postRequest = batchOps.find((op) => op.params?.method?.toUpperCase() === 'POST')

      const method = (postRequest && 'POST') || options.method || 'POST'

      const resolvedBatchOps = await Promise.all(batchOps.map(edenParamsResolver))

      const serializer = batchSerializers[method]

      const resolvedBatchParams = await serializer(resolvedBatchOps)

      if (options.stream) {
        resolvedBatchParams.headers.set('accept', 'text/event-stream')
      }

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
