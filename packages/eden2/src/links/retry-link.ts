import type { EdenClientError } from '../core/errors'
import type { InternalElysia } from '../elysia'
import { Observable, type Unsubscribable } from '../observable'
import type { EdenLink } from './internal/eden-link'
import { inputWithTrackedEventId } from './internal/input-with-tracked-event-id'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

interface RetryLinkOptions<TElysia extends InternalElysia = InternalElysia, TKey = undefined> {
  /**
   * The retry function
   */
  retry: (opts: RetryFnOptions<TElysia, TKey>) => boolean
}

interface RetryFnOptions<TElysia extends InternalElysia = InternalElysia, TKey = undefined> {
  /**
   * The operation that failed
   */
  op: Operation<TElysia, TKey>

  /**
   * The error that occurred
   */
  error: EdenClientError<TElysia>

  /**
   * The number of attempts that have been made (including the first call)
   */
  attempts: number
}

/**
 * @see https://trpc.io/docs/v11/client/links/retryLink
 */
export function retryLink<TElysia extends InternalElysia = InternalElysia, TKey = undefined>(
  options: RetryLinkOptions<TElysia, TKey>,
): EdenLink<TElysia, TKey> {
  const link = (() => {
    const operationLink = ((callOptions) => {
      // Initialized for request.
      return new Observable((observer) => {
        let next$: Unsubscribable

        let lastEventId: string | undefined = undefined

        attempt(1)

        function opWithLastEventId() {
          const op = callOptions.op

          if (!lastEventId) return op

          return {
            ...op,
            input: inputWithTrackedEventId(op.params, lastEventId),
          }
        }

        function attempt(attempts: number) {
          const op = opWithLastEventId()

          next$ = callOptions.next(op).subscribe({
            error(error) {
              const shouldRetry = options.retry({
                op,
                attempts,
                error,
              })

              if (shouldRetry) {
                attempt(attempts + 1)
              } else {
                observer.error(error)
              }
            },
            next(envelope) {
              if (!envelope?.result) return observer.next(envelope)

              if (
                (!envelope.result?.type || envelope.result?.type === 'data') &&
                envelope.result.id
              ) {
                //
                lastEventId = envelope.result.id
              }

              observer.next(envelope)
            },
            complete() {
              observer.complete()
            },
          })
        }

        return () => {
          next$.unsubscribe()
        }
      })
    }) satisfies OperationLink<TElysia, TKey>

    return operationLink
  }) satisfies EdenLink<TElysia, TKey>

  return link
}
