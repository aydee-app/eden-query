import type { AnyElysia } from 'elysia'

import { getTransformer, type TransformerOptions } from '../../core/transformer'
import type { EdenLink } from '../internal/eden-link'
import { Observable } from '../internal/observable'
import type { OperationLink } from '../internal/operation-link'
import type { WsClient } from './ws-client'

/**
 * Example of storing type information in Elysia.js through metadata.
 */
export type WebSocketLinkOptions<T extends AnyElysia> = {
  client: WsClient
} & TransformerOptions<T['_types']['Metadata']['transformer']>

export function wsLink<T extends AnyElysia>(opts: WebSocketLinkOptions<T>): EdenLink<T> {
  const transformer = getTransformer(opts.transformer)

  const link: EdenLink<T> = () => {
    const operationLink: OperationLink<T> = ({ op }) => {
      return new Observable((observer) => {
        const connectionStateSubscription =
          op.type === 'subscription'
            ? opts.client.connectionState.subscribe({
                next(result) {
                  observer.next({
                    result,
                    context: op.context,
                  })
                },
              })
            : null

        const requestSubscription = opts.client.request({ op, transformer }).subscribe(observer)

        return () => {
          requestSubscription.unsubscribe()
          connectionStateSubscription?.unsubscribe()
        }
      })
    }

    return operationLink
  }

  return link
}
