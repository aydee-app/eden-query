import { type EventSourceLike, sseStreamConsumer } from '@trpc/server/unstable-core-do-not-import'

import type { EdenResult, EdenWebSocketState } from '../core/dto'
import { EdenClientError } from '../core/error'
import { EDEN_SERVER_ERROR_CODES } from '../core/error-codes'
import { resolveEdenFetchPath } from '../core/resolve'
import { resolveTransformer } from '../core/transform'
import type { InternalElysia } from '../core/types'
import { behaviorSubject, Observable } from '../observable'
import { type CallbackOrValue, resolveCallbackOrValue } from '../utils/callback-or-value'
import { buildQueryString, mergeQuery } from '../utils/query'
import { raceAbortSignals } from '../utils/signal'
import type { MaybePromise } from '../utils/types'
import type { WebSocketUrlOptions } from '../ws/url'
import type { HTTPLinkBaseOptions } from './http-link'
import type { EdenLink, Operation, OperationLink } from './types'

/**
 * tRPC error codes that are considered retryable
 * With out of the box SSE, the client will reconnect when these errors are encountered
 */
const internalServerErrorCodes: number[] = Object.values(EDEN_SERVER_ERROR_CODES)

type HTTPSubscriptionLinkOptions<
  TElysia extends InternalElysia,
  TConfig = undefined,
  TEventSource extends EventSourceLike.AnyConstructor = typeof EventSource,
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
  const TConfig,
  TEventSource extends EventSourceLike.AnyConstructor,
>(
  options: HTTPSubscriptionLinkOptions<NoInfer<TElysia>, TConfig, TEventSource>,
): EdenLink<TElysia> {
  const internalOptions = options as HTTPSubscriptionLinkOptions<any>

  const transformer = resolveTransformer(internalOptions.transformer)

  const EventSource = options.EventSource ?? (globalThis.EventSource as any)

  const link = ((runtimeOptions) => {
    options = { ...runtimeOptions, ...options }

    const operationLink = (({ op }) => {
      return new Observable((observer) => {
        const { type, path, params } = op

        if (type !== 'subscription') {
          throw new Error('httpSubscriptionLink only supports subscriptions')
        }

        const resolvedParams = { path, ...params }

        const resolvedPath = resolveEdenFetchPath(resolvedParams)

        // const resolvedOptions = resolveFetchOptions(resolvedParams)

        let lastEventId: string

        const abortController = new AbortController()

        const signal = raceAbortSignals(op.signal, abortController.signal)

        type TConsumerConfig = {
          EventSource: TEventSource
          data: Partial<{ id?: string; data: unknown }>
          error: EdenClientError
        }

        const eventSourceStream = sseStreamConsumer<TConsumerConfig>({
          url: async () => {
            const query = mergeQuery(params.query, params.input?.query)

            if (lastEventId) {
              query.append('lastEventId', lastEventId)
            }

            const queryString = buildQueryString(query)

            const pathWithQuery = `${resolvedPath}${queryString ? '?' : ''}${queryString}`

            return options.url + pathWithQuery
          },
          init: () => {
            const eventSourceOptions = resolveCallbackOrValue(options.eventSourceOptions, op)

            // resolvedOptions

            return { ...eventSourceOptions }
          },
          signal,
          deserialize: transformer?.output.deserialize,
          EventSource,
        })

        const connectionState = behaviorSubject<EdenWebSocketState<EdenClientError>>({
          type: 'state',
          state: 'connecting',
          error: undefined,
        })

        const connectionSub = connectionState.subscribe({
          next(state) {
            observer.next({ result: state, context: op.context })
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

                observer.next({ result, context: { eventSource: chunk.eventSource } })

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

                connectionState.next({ type: 'state', state: 'pending', error: undefined })

                break
              }

              case 'serialized-error': {
                const error = EdenClientError.from({ error: chunk.error })

                if (error.code && internalServerErrorCodes.includes(error.code)) {
                  connectionState.next({ type: 'state', state: 'connecting', error })

                  break
                }

                // Unrecoverable error, cancel the subscription.
                throw error
              }

              case 'connecting': {
                const lastState = connectionState.get()

                const error = chunk.event && EdenClientError.from(chunk.event)

                if (error || lastState.state === 'connecting') {
                  connectionState.next({ type: 'state', state: 'connecting', error })
                }

                break
              }

              case 'timeout': {
                const message = `Timeout of ${chunk.ms}ms reached while waiting for a response`

                const error = new EdenClientError(message)

                connectionState.next({ type: 'state', state: 'connecting', error })
              }
            }
          }

          observer.next({ result: { type: 'stopped' }, context: op.context })

          connectionState.next({ type: 'state', state: 'idle', error: undefined })

          observer.complete()
        }

        run().catch((err: any) => {
          const error = EdenClientError.from(err)
          observer.error(error)
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

export { sseStreamConsumer, sseStreamProducer } from '@trpc/server/unstable-core-do-not-import'
