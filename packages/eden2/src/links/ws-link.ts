import type { InternalElysia } from '../elysia'
import { Observable } from '../observable'
import { getTransformer } from '../trpc/client/transformer'
import type { DataTransformerOptions } from '../trpc/server/transformer'
import type { WebSocketClient } from '../ws/client'
import type { EdenLink } from './internal/eden-link'

export type WebSocketLinkOptions<
  _TElysia extends InternalElysia = InternalElysia,
  _TKey = undefined,
> = {
  client: WebSocketClient
  transformer?: DataTransformerOptions
}

export function wsLink<TElysia extends InternalElysia = InternalElysia, TKey = undefined>(
  options: WebSocketLinkOptions<TElysia>,
): EdenLink<TElysia, TKey> {
  const { client } = options

  const transformer = getTransformer(options.transformer)

  return () => {
    return ({ op }) => {
      return new Observable((observer) => {
        const connStateSubscription =
          op.type === 'subscription'
            ? client.connectionState.subscribe({
                next(result) {
                  observer.next({
                    result,
                    context: op.context,
                  })
                },
              })
            : null

        const requestSubscription = client.request({ op, transformer }).subscribe(observer)

        return () => {
          requestSubscription.unsubscribe()
          connStateSubscription?.unsubscribe()
        }
      })
    }
  }
}
