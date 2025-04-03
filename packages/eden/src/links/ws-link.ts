import type { EDEN_STATE_KEY } from '../constants'
import { type AnyDataTransformer, resolveTransformer } from '../core/transform'
import type { InternalElysia, TypeConfig } from '../core/types'
import { Observable } from '../observable'
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
  TConfig extends WsLinkOptions<any, any>,
> = TConfig['types'] extends PropertyKey
  ? ConfigWithWs extends TElysia['store'][Extract<TConfig['types'], keyof TElysia['store']>]
    ? EdenLink<TElysia>
    : WsNotDetectedError
  : TConfig['types'] extends true
    ? TElysia['store'][typeof EDEN_STATE_KEY] extends ConfigWithWs
      ? EdenLink<TElysia>
      : WsNotDetectedError
    : EdenLink<TElysia>

export function wsLink<
  TElysia extends InternalElysia,
  const TConfig extends WsLinkOptions<TElysia, TConfig['types']>,
>(options: TConfig): WsLinkResult<TElysia, TConfig> {
  const { client } = options

  const transformer = resolveTransformer(options.transformer)

  const link = (() => {
    const operationLink = (({ op }) => {
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
    }) satisfies OperationLink<TElysia>

    return operationLink
  }) satisfies EdenLink<TElysia>

  return link as any
}
