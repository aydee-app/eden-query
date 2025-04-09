import { parseStringifiedValue } from '../utils/parse'
import type { MaybeArray } from '../utils/types'
import { WebSocketClient } from '../ws/client'

export interface OnMessage<Data = any> extends MessageEvent {
  data: Data
  rawData: MessageEvent['data']
}

export type WebSocketEvent<TKey = keyof WebSocketEventMap, TData = any> = TKey extends 'message'
  ? OnMessage<TData>
  : TKey extends keyof WebSocketEventMap
    ? WebSocketEventMap[TKey]
    : never

export type WebSocketListener<TKey = any, TData = any> = (
  event: WebSocketEvent<TKey, TData>,
) => void

/**
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty/index.ts#L59
 */
export class EdenWs<T extends Record<string, any> = {}> extends WebSocketClient {
  override setupWebSocketListeners() {}

  subscribe(
    onMessage: (event: WebSocketEvent<'message', T['response']>) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    return this.addEventListener('message', onMessage, options)
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEvent<K, T['response']>) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    const resolvedListener = this.handleMessage.bind(this, type, listener)
    this.activeConnection.ws?.addEventListener(type, resolvedListener, options)
    return this
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ) {
    this.activeConnection.ws?.removeEventListener(type, listener, options)
    return this
  }

  override send(data: MaybeArray<T['body']>) {
    if (Array.isArray(data)) {
      data.forEach((datum) => this.send(datum))
      return this
    }

    const message = typeof data === 'object' ? JSON.stringify(data) : data.toString()

    this.activeConnection.ws?.send(message)

    return this
  }

  private handleMessage = (
    type: keyof WebSocketEventMap,
    listener: WebSocketListener,
    event: Event,
  ) => {
    if (type !== 'message') {
      listener(event)
    } else {
      const data = parseMessageEvent(event)
      listener({ ...event, data })
    }
  }

  on = this.addEventListener

  off = this.removeEventListener
}

function parseMessageEvent(event: Event) {
  if ('data' in event && event.data) {
    const messageString = event.data.toString()
    return messageString === 'null' ? null : parseStringifiedValue(messageString)
  }
  return null
}
