import type { EdenResult, EdenWsStateResult } from '../core/dto'
import { EdenClientError, type EdenError } from '../core/error'
import { resolveTransformer } from '../core/transform'
import type { InternalElysia, TypeConfig } from '../core/types'
import { behaviorSubject, Observable } from '../observable'
import { sseStreamConsumer } from '../stream/sse'
import type { EventSourceLike } from '../stream/types'
import { type CallbackOrValue, resolveCallbackOrValue } from '../utils/callback-or-value'
import { raceAbortSignals } from '../utils/signal'
import type { MaybePromise } from '../utils/types'
import type { WebSocketUrlOptions } from '../ws/url'
import type { HTTPLinkBaseOptions } from './http-link'
import type { EdenLink, Operation, OperationLink } from './types'

/**
 * JSON-RPC 2.0 Error codes
 *
 * `-32000` to `-32099` are reserved for implementation-defined server-errors.
 * For tRPC we're copying the last digits of HTTP 4XX errors.
 */
export const TRPC_ERROR_CODES_BY_KEY = {
  /**
   * Invalid JSON was received by the server.
   * An error occurred on the server while parsing the JSON text.
   */
  PARSE_ERROR: -32700,
  /**
   * The JSON sent is not a valid Request object.
   */
  BAD_REQUEST: -32600, // 400

  // Internal JSON-RPC error
  INTERNAL_SERVER_ERROR: -32603, // 500
  NOT_IMPLEMENTED: -32603, // 501
  BAD_GATEWAY: -32603, // 502
  SERVICE_UNAVAILABLE: -32603, // 503
  GATEWAY_TIMEOUT: -32603, // 504

  // Implementation specific errors
  UNAUTHORIZED: -32001, // 401
  FORBIDDEN: -32003, // 403
  NOT_FOUND: -32004, // 404
  METHOD_NOT_SUPPORTED: -32005, // 405
  TIMEOUT: -32008, // 408
  CONFLICT: -32009, // 409
  PRECONDITION_FAILED: -32012, // 412
  PAYLOAD_TOO_LARGE: -32013, // 413
  UNSUPPORTED_MEDIA_TYPE: -32015, // 415
  UNPROCESSABLE_CONTENT: -32022, // 422
  TOO_MANY_REQUESTS: -32029, // 429
  CLIENT_CLOSED_REQUEST: -32099, // 499
} as const

export type TRPC_ERROR_CODE_NUMBER =
  (typeof TRPC_ERROR_CODES_BY_KEY)[keyof typeof TRPC_ERROR_CODES_BY_KEY]

/**
 * tRPC error codes that are considered retryable
 * With out of the box SSE, the client will reconnect when these errors are encountered
 */
const codes5xx: TRPC_ERROR_CODE_NUMBER[] = [
  TRPC_ERROR_CODES_BY_KEY.BAD_GATEWAY,
  TRPC_ERROR_CODES_BY_KEY.SERVICE_UNAVAILABLE,
  TRPC_ERROR_CODES_BY_KEY.GATEWAY_TIMEOUT,
  TRPC_ERROR_CODES_BY_KEY.INTERNAL_SERVER_ERROR,
]

type HTTPSubscriptionLinkOptions<
  TElysia extends InternalElysia,
  TEventSource extends EventSourceLike.AnyConstructor = typeof EventSource,
  TConfig extends TypeConfig = undefined,
> = HTTPLinkBaseOptions<TElysia, TConfig> & {
  /**
   * EventSource ponyfill.
   */
  EventSource?: TEventSource

  /**
   * EventSource options or a callback that returns them
   */
  eventSourceOptions?: CallbackOrValue<
    MaybePromise<EventSourceLike.InitDictOf<TEventSource>>,
    [Operation]
  >
} & WebSocketUrlOptions

/**
 * @see https://trpc.io/docs/client/links/httpSubscriptionLink
 */
export function httpSubscriptionLink<
  TElysia extends InternalElysia,
  TEventSource extends EventSourceLike.AnyConstructor,
>(opts: HTTPSubscriptionLinkOptions<TElysia, TEventSource>): EdenLink<TElysia> {
  const transformer = resolveTransformer(opts.transformer)

  const link = (() => {
    const operationLink = (({ op }) => {
      return new Observable((observer) => {
        const { type } = op

        /* istanbul ignore if -- @preserve */
        if (type !== 'subscription') {
          throw new Error('httpSubscriptionLink only supports subscriptions')
        }

        let lastEventId: string | undefined = undefined

        const abortController = new AbortController()

        const signal = raceAbortSignals(op.signal, abortController.signal)

        type TConsumerConfig = {
          EventSource: TEventSource
          data: Partial<{
            id?: string
            data: unknown
          }>
          error: any // TRPCErrorShape
        }

        const eventSourceStream = sseStreamConsumer<TConsumerConfig>({
          url: async () => {
            return lastEventId?.toString() || ''
            // getUrl({
            //   transformer,
            //   url: await urlWithConnectionParams(opts),
            //   input: inputWithTrackedEventId(input, lastEventId),
            //   path,
            //   type,
            //   signal: null,
            // })
          },
          init: () => {
            return resolveCallbackOrValue(opts.eventSourceOptions, op)
          },
          signal,
          deserialize: transformer?.output.deserialize,
          EventSource: opts.EventSource ?? (globalThis.EventSource as never as TEventSource),
        })

        const connectionState = behaviorSubject<EdenWsStateResult<EdenError>>({
          type: 'state',
          state: 'connecting',
          error: undefined,
        })

        const connectionSub = connectionState.subscribe({
          next(state) {
            observer.next({
              result: state,
            })
          },
        })

        ;(async () => {
          for await (const chunk of eventSourceStream) {
            switch (chunk.type) {
              case 'ping':
                // do nothing
                break

              case 'data': {
                const chunkData = chunk.data

                let result: EdenResult

                if (chunkData.id) {
                  // if the `tracked()`-helper is used, we always have an `id` field
                  lastEventId = chunkData.id
                  result = {
                    id: chunkData.id,
                    data: chunkData,
                    response: {} as any,
                  }
                } else {
                  result = {
                    data: chunkData.data,
                    response: {} as any,
                  }
                }

                observer.next({
                  result,
                  context: {
                    eventSource: chunk.eventSource,
                  },
                })

                break
              }

              case 'connected': {
                observer.next({
                  result: {
                    type: 'started',
                  },
                  context: {
                    eventSource: chunk.eventSource,
                  },
                })

                connectionState.next({
                  type: 'state',
                  state: 'pending',
                  error: undefined,
                })
                break
              }

              case 'serialized-error': {
                // const error = TRPCClientError.from({ error: chunk.error })
                const error = chunk.error

                if (codes5xx.includes(chunk.error.code)) {
                  //
                  connectionState.next({
                    type: 'state',
                    state: 'connecting',
                    error,
                  })
                  break
                }

                //
                // non-retryable error, cancel the subscription
                throw error
              }

              case 'connecting': {
                const lastState = connectionState.get()

                // const error = chunk.event && TRPCClientError.from(chunk.event)
                const error: any = chunk.event

                if (!error && lastState.state === 'connecting') {
                  break
                }

                connectionState.next({
                  type: 'state',
                  state: 'connecting',
                  error,
                })
                break
              }

              case 'timeout': {
                connectionState.next({
                  type: 'state',
                  state: 'connecting',
                  error: new EdenClientError(123, ''),
                  // new TRPCClientError(
                  //    `Timeout of ${chunk.ms}ms reached while waiting for a response`,
                  //  ),
                })
              }
            }
          }

          observer.next({ result: { type: 'stopped' } })

          connectionState.next({
            type: 'state',
            state: 'idle',
            error: undefined,
          })

          observer.complete()
        })().catch((error: any) => {
          observer.error(error)
          // observer.error(TRPCClientError.from(error))
        })

        return () => {
          observer.complete()
          abortController.abort()
          connectionSub.unsubscribe()
        }
      })
    }) satisfies OperationLink<TElysia>

    return operationLink
  }) satisfies EdenLink<TElysia>

  return link
}
