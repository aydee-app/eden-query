import { type AnyDataTransformer,resolveTransformer } from '../core/transform'
import type { InternalElysia } from '../core/types'
import { Observable } from '../observable'
import type { WebSocketClient } from '../ws/client'
import type { EdenLink } from './types'

export type WebSocketLinkOptions<_T extends InternalElysia = InternalElysia> = {
  client: WebSocketClient
  transformer?: AnyDataTransformer
}

export function wsLink<T extends InternalElysia>(options: WebSocketLinkOptions<T>): EdenLink<T> {
  const { client } = options

  const transformer = resolveTransformer(options.transformer)

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
