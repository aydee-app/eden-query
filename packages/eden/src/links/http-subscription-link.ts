import { type EventSourceLike, sseStreamConsumer } from '@trpc/server/unstable-core-do-not-import'

import type { EdenResult, EdenWebSocketState } from '../core/dto'
import { EdenError } from '../core/error'
import { EDEN_SERVER_ERROR_CODES } from '../core/error-codes'
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
const internalServerErrorCodes = Object.values(EDEN_SERVER_ERROR_CODES)

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

  const link = ((runtimeOptions) => {
    options = { ...runtimeOptions, ...options }

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
          error: EdenError
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

        const connectionState = behaviorSubject<EdenWebSocketState<EdenError>>({
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
                    type: 'data',
                    response: {} as any,
                  }
                } else {
                  result = {
                    type: 'data',
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
                const error: any = chunk.error

                if (internalServerErrorCodes.includes(error.code)) {
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
                const message = `Timeout of ${chunk.ms}ms reached while waiting for a response`

                connectionState.next({
                  type: 'state',
                  state: 'connecting',
                  error: new EdenError(message),
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
