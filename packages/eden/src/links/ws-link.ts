import { type AnyDataTransformer, resolveTransformer } from '../core/transform'
import type {
  InternalElysia,
  InternalTypeConfig,
  ResolveTypeConfig,
  TypeConfig,
} from '../core/types'
import { Observable, type Unsubscribable } from '../observable'
import type { TypeError } from '../utils/types'
import type { WebSocketClient } from '../ws/client'
import type { HTTPLinkBaseOptions } from './http-link'
import type { EdenLink, OperationLink } from './types'

export type WsNotDetectedError = TypeError<'WS plugin not detected on Elysia.js server application'>

export type WsLinkOptions<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
> = HTTPLinkBaseOptions<TElysia, TConfig> & {
  client: WebSocketClient
  transformer?: AnyDataTransformer
}

export type ConfigWithWs = { ws: any }

export type WsLinkResult<
  TElysia extends InternalElysia,
  TConfig extends TypeConfig,
  TResolvedConfig extends InternalTypeConfig = ResolveTypeConfig<TConfig>,
> = TResolvedConfig['key'] extends PropertyKey
  ? TElysia['store'][Extract<TResolvedConfig['key'], keyof TElysia['store']>] extends ConfigWithWs
    ? EdenLink<TElysia>
    : WsNotDetectedError
  : EdenLink<TElysia>

export function wsLink<TElysia extends InternalElysia, const TConfig>(
  options: WsLinkOptions<NoInfer<TElysia>, TConfig>,
): WsLinkResult<TElysia, TConfig> {
  const { client } = options

  const transformer = resolveTransformer(options.transformer)

  const link = (() => {
    const operationLink = (({ op }) => {
      return new Observable((observer) => {
        const subscriptions: Unsubscribable[] = []

        if (op.type === 'subscription') {
          const connectionStateSubscription = client.connectionState.subscribe({
            next(result) {
              observer.next({
                result,
                context: op.context,
              })
            },
          })

          subscriptions.push(connectionStateSubscription)
        }

        const requestSubscription = client.request({ op, transformer }).subscribe(observer)

        subscriptions.push(requestSubscription)

        return () => {
          subscriptions.forEach((subscription) => subscription.unsubscribe())
        }
      })
    }) satisfies OperationLink<TElysia>

    return operationLink
  }) satisfies EdenLink<TElysia>

  return link as any
}
