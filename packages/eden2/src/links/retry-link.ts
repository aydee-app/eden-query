import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../core/errors'
import type { EdenLink } from './internal/eden-link'
import { inputWithTrackedEventId } from './internal/input-with-tracked-event-id'
import { Observable, type Unsubscribable } from './internal/observable'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

interface RetryLinkOptions<T extends AnyElysia> {
  /**
   * The retry function
   */
  retry: (opts: RetryFnOptions<T>) => boolean
}

interface RetryFnOptions<T extends AnyElysia> {
  /**
   * The operation that failed
   */
  op: Operation

  /**
   * The error that occurred
   */
  error: EdenClientError<T>

  /**
   * The number of attempts that have been made (including the first call)
   */
  attempts: number
}

/**
 * @see https://trpc.io/docs/v11/client/links/retryLink
 */
export function retryLink<T extends AnyElysia>(options: RetryLinkOptions<T>): EdenLink<T> {
  // Initialized config.
  const link: EdenLink<T> = () => {
    // Initialized in app.
    const operationLink: OperationLink<T> = (callOptions) => {
      // Initialized for request.
      const observable = new Observable((observer) => {
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
              if (
                (!envelope.result.type || envelope.result.type === 'data') &&
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

      return observable
    }

    return operationLink
  }

  return link
}
