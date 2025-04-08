import {
  type EventSourceLike,
  sseStreamConsumer,
  type TRPC_ERROR_CODE_NUMBER,
  TRPC_ERROR_CODES_BY_KEY,
} from '@trpc/server/unstable-core-do-not-import'

import type { EdenResult, EdenWsStateResult } from '../core/dto'
import { EdenClientError, type EdenError } from '../core/error'
import { resolveEdenFetchPath } from '../core/resolve'
import { resolveTransformer } from '../core/transform'
import type { InternalElysia } from '../core/types'
import { behaviorSubject, Observable } from '../observable'
import { type CallbackOrValue, resolveCallbackOrValue } from '../utils/callback-or-value'
import { buildQueryString } from '../utils/query'
import { raceAbortSignals } from '../utils/signal'
import type { MaybePromise } from '../utils/types'
import type { WebSocketUrlOptions } from '../ws/url'
import type { HTTPLinkBaseOptions } from './http-link'
import type { EdenLink, Operation, OperationLink } from './types'

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
  TConfig = undefined,
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
>(options: HTTPSubscriptionLinkOptions<NoInfer<TElysia>, TEventSource>): EdenLink<TElysia> {
  const transformer = resolveTransformer(options.transformer)

  const EventSource = options.EventSource ?? (globalThis.EventSource as any)

  const link = (() => {
    const operationLink = (({ op }) => {
      return new Observable((observer) => {
        const { type, path, params } = op

        if (type !== 'subscription') {
          throw new Error('httpSubscriptionLink only supports subscriptions')
        }

        const resolvedParams = {
          path,
          ...params,
        }

        const resolvedPath = resolveEdenFetchPath(resolvedParams)

        let lastEventId: string

        const abortController = new AbortController()

        const signal = raceAbortSignals(op.signal, abortController.signal)

        type TConsumerConfig = {
          EventSource: TEventSource
          data: Partial<{ id?: string; data: unknown }>
          error: any // TRPCErrorShape
        }

        const eventSourceStream = sseStreamConsumer<TConsumerConfig>({
          url: async () => {
            const queryObject = { ...params.query }

            if (lastEventId) {
              queryObject['lastEventId'] = lastEventId
            }

            const query = buildQueryString(queryObject)

            const pathWithQuery = `${resolvedPath}${query ? '?' : ''}${query}`

            return options.url + pathWithQuery
          },
          init: resolveCallbackOrValue.bind(null, options.eventSourceOptions, op),
          signal,
          deserialize: transformer?.output.deserialize,
          EventSource,
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

        const run = async () => {
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
                  // new TRPCClientError(`Timeout of ${chunk.ms}ms reached while waiting for a response`),
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
        }

        run().catch((error: any) => {
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
