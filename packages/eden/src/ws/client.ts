import type { MaybeArray } from 'elysia'

import type { EdenWsIncomingMessage, EdenWsOutgoingMessage, EdenWsStateResult } from '../core/dto'
import { type EdenError, EdenWebSocketClosedError } from '../core/error'
import { type AnyDataTransformer, matchTransformer } from '../core/transform'
import type { Operation, OperationLinkResult } from '../links/types'
import { type BehaviorSubject, behaviorSubject, Observable } from '../observable'
import { toArray } from '../utils/array'
import { ResettableTimeout } from '../utils/resettable-timeout'
import { sleep } from '../utils/sleep'
import { backwardCompatibility, type KeepAliveOptions, WebSocketConnection } from './connection'
import { RequestManager, type WebSocketRequestCallbacks } from './request-manager'
import type { WebSocketUrlOptions } from './url'

export interface WebSocketClientLazyOptions {
  /**
   * Enable lazy mode
   * @default false
   */
  enabled: boolean

  /**
   * Close the WebSocket after this many milliseconds
   * @default 0
   */
  closeMs: number
}

export interface WebSocketClientOptions extends WebSocketUrlOptions {
  WebSocket?: typeof WebSocket

  keepAlive?: KeepAliveOptions

  /**
   * Triggered when a WebSocket connection is established
   */
  onOpen?: () => void

  /**
   * Triggered when a WebSocket connection encounters an error
   */
  onError?: (evt?: Event) => void

  /**
   * Triggered when a WebSocket connection is closed
   */
  onClose?: (cause?: { code?: number }) => void

  /**
   * Lazy mode will close the WebSocket automatically after a period of inactivity (no messages sent or received and no pending requests)
   */
  lazy?: WebSocketClientLazyOptions

  /**
   * The number of milliseconds before a reconnect is attempted.
   * @default {@link exponentialBackoff}
   */
  retryDelayMs?: (attemptIndex: number) => number
}

/**
 * Calculates a delay for exponential backoff based on the retry attempt index.
 * The delay starts at 0 for the first attempt and doubles for each subsequent attempt,
 * capped at 30 seconds.
 */
export const exponentialBackoff = (attemptIndex: number) => {
  return attemptIndex === 0 ? 0 : Math.min(1000 * 2 ** attemptIndex, 30000)
}

export interface WebSocketRequestOptions {
  op: Operation
  transformer?: AnyDataTransformer
  lastEventId?: string
}

export type WebSocketConnectionState = EdenWsStateResult<EdenError>

export const WEBSOCKET_CONNECTION_STATES = {
  CONNECTING: {
    type: 'state',
    state: 'connecting',
    data: undefined,
    error: undefined,
  },
  IDLE: {
    type: 'state',
    state: 'idle',
    data: undefined,
    error: undefined,
  },
  PENDING: {
    type: 'state',
    state: 'pending',
    data: undefined,
    error: undefined,
  },
} satisfies Record<string, WebSocketConnectionState>

/**
 * A WebSocket client for managing TRPC operations, supporting lazy initialization,
 * reconnection, keep-alive, and request management.
 */
export class WebSocketClient {
  /**
   * Observable tracking the current connection state, including errors.
   */
  public readonly connectionState: BehaviorSubject<WebSocketConnectionState>

  private allowReconnect = false

  private requestManager = new RequestManager()

  private readonly activeConnection: WebSocketConnection

  private readonly reconnectRetryDelay: (attemptIndex: number) => number

  private inactivityTimeout: ResettableTimeout

  private readonly lazyMode: boolean

  /**
   * Manages the reconnection process for the WebSocket using retry logic.
   * Ensures that only one reconnection attempt is active at a time by tracking the current
   * reconnection state in the `reconnecting` promise.
   */
  private reconnecting?: Promise<void>

  constructor(public readonly options: WebSocketClientOptions) {
    const lazyOptions = {
      enabled: false,
      closeMs: 0,
      ...options.lazy,
    }

    this.inactivityTimeout = new ResettableTimeout(() => {
      if (this.requestManager.hasOutgoingRequests() || this.requestManager.hasPendingRequests()) {
        this.inactivityTimeout.reset()
        return
      }

      this.close().catch(() => null)
    }, lazyOptions.closeMs)

    this.activeConnection = new WebSocketConnection({
      WebSocket: options.WebSocket,
      url: options,
      keepAlive: {
        enabled: false,
        pongTimeoutMs: 1_000,
        intervalMs: 5_000,
        ...options.keepAlive,
      },
    })

    this.activeConnection.wsObservable.subscribe({
      next: (ws) => {
        if (!ws) return
        this.setupWebSocketListeners(ws)
      },
    })

    this.reconnectRetryDelay = options.retryDelayMs ?? exponentialBackoff

    this.lazyMode = lazyOptions.enabled

    const connectionState = lazyOptions.enabled
      ? WEBSOCKET_CONNECTION_STATES.IDLE
      : WEBSOCKET_CONNECTION_STATES.CONNECTING

    this.connectionState = behaviorSubject<WebSocketConnectionState>(connectionState)

    if (!this.lazyMode) {
      this.open().catch(() => null)
    }
  }

  public get connection() {
    return backwardCompatibility(this.activeConnection)
  }

  /**
   * Opens the WebSocket connection. Handles reconnection attempts and updates
   * the connection state accordingly.
   */
  private async open() {
    this.allowReconnect = true

    if (this.connectionState.get().state !== 'connecting') {
      this.connectionState.next(WEBSOCKET_CONNECTION_STATES.CONNECTING)
    }

    const result = await this.activeConnection.open().catch((cause) => {
      const error = new EdenWebSocketClosedError({
        message: 'Initialization error',
        cause: cause,
      })

      this.reconnect(error)

      return this.reconnecting
    })

    return result
  }

  /**
   * Closes the WebSocket connection and stops managing requests.
   * Ensures all outgoing and pending requests are properly finalized.
   */
  public async close() {
    this.allowReconnect = false
    this.inactivityTimeout.stop()

    const requestsToAwait: Promise<void>[] = []

    for (const request of this.requestManager.getRequests()) {
      if (request.message.method === 'subscription') {
        request.callbacks.complete()
        continue
      }

      if (request.state === 'outgoing') {
        const error = new EdenWebSocketClosedError({
          message: 'Closed before connection was established',
        })

        request.callbacks.error(error as any)

        continue
      }

      requestsToAwait.push(request.end)
    }

    await Promise.all(requestsToAwait).catch(() => null)
    await this.activeConnection.close().catch(() => null)

    this.connectionState.next(WEBSOCKET_CONNECTION_STATES.IDLE)
  }

  /**
   * Method to request the server.
   * Handles data transformation, batching of requests, and subscription lifecycle.
   *
   * @param op - The operation details including id, type, path, input and signal
   * @param transformer - Data transformer for serializing requests and deserializing responses
   * @param lastEventId - Optional ID of the last received event for subscriptions
   *
   * @returns An observable that emits operation results and handles cleanup
   *
   * @see https://github.com/trpc/trpc/blob/f6efa479190996c22bc1e541fdb1ad6a9c06f5b1/packages/server/src/unstable-core-do-not-import/transformer.ts#L168
   */
  public request(options: WebSocketRequestOptions) {
    const { op, lastEventId } = options

    const { id, type, params, signal } = op

    const transformer = matchTransformer(params.transformers, params.transformer)

    return new Observable<OperationLinkResult>((observer) => {
      const abort = this.batchSend(
        {
          id,
          method: type,
          params: {
            params,
            lastEventId,
          },
        },
        {
          ...observer,
          async next(event) {
            if (transformer) {
              if (event.error) {
                event.error = await transformer.output.deserialize(event.error)
              }

              if (event.result?.data) {
                event.result.data = await transformer.output.deserialize(event.result.data)
              }
            }

            if (event.error) {
              observer.error(event.error)
            } else {
              observer.next(event)
            }
          },
        },
      )

      return () => {
        abort()

        if (type === 'subscription' && this.activeConnection.isOpen()) {
          this.send({ id, method: 'subscription.stop' })
        }

        signal?.removeEventListener('abort', abort)
      }
    })
  }

  private reconnect(error: any) {
    this.connectionState.next({ type: 'state', state: 'connecting', error })

    if (this.reconnecting) return

    const tryReconnect = async (attemptIndex: number) => {
      try {
        await sleep(this.reconnectRetryDelay(attemptIndex))

        if (this.allowReconnect) {
          await this.activeConnection.close()
          await this.activeConnection.open()

          if (this.requestManager.hasPendingRequests()) {
            this.send(this.requestManager.getPendingRequests().map(({ message }) => message))
          }
        }
        this.reconnecting = undefined
      } catch {
        await tryReconnect(attemptIndex + 1)
      }
    }

    this.reconnecting = tryReconnect(0)
  }

  handleCloseOrError = (cause?: unknown) => {
    const reqs = this.requestManager.getPendingRequests()

    for (const { message, callbacks } of reqs) {
      if (message.method === 'subscription') continue

      const error = cause ?? new EdenWebSocketClosedError({ message: 'WebSocket closed', cause })

      callbacks.error(error as any)

      this.requestManager.delete(message.id)
    }
  }

  #onOpen = async () => {
    if (this.lazyMode) {
      this.inactivityTimeout.start()
    }

    this.options.onOpen?.()

    this.connectionState.next(WEBSOCKET_CONNECTION_STATES.PENDING)
  }

  private setupWebSocketListeners(ws: WebSocket) {
    ws.addEventListener('open', () => {
      this.#onOpen().catch((error) => {
        ws.close(3000)
        this.handleCloseOrError(error)
      })
    })

    ws.addEventListener('message', async (message) => {
      this.inactivityTimeout.reset()

      if (typeof message.data !== 'string' || ['PING', 'PONG'].includes(message.data)) return

      const incomingMessage: MaybeArray<EdenWsIncomingMessage> = JSON.parse(message.data)

      const incomingMessages = toArray(incomingMessage)

      await Promise.all(incomingMessages.map(this.handleResponseMessage))

      // if ('method' in incomingMessage) {
      //   // Reconnections are communicated as results now.
      //   // this.handleIncomingRequest(incomingMessage)
      // } else {
      //   this.handleResponseMessage(incomingMessage)
      // }
    })

    ws.addEventListener('close', (event) => {
      this.handleCloseOrError(event)

      this.options.onClose?.(event)

      if (!this.lazyMode) {
        const error = new EdenWebSocketClosedError({
          message: 'WebSocket closed',
          cause: event,
        })

        this.reconnect(error)
      }
    })

    ws.addEventListener('error', (event) => {
      this.handleCloseOrError(event)

      this.options.onError?.(event)

      const error = new EdenWebSocketClosedError({
        message: 'WebSocket closed',
        cause: event,
      })

      this.reconnect(error)
    })
  }

  private handleResponseMessage = (message: EdenWsIncomingMessage) => {
    // Special message that does not have an originating request.
    if (message.result?.type === 'reconnect') {
      const error = new EdenWebSocketClosedError({ message: 'Server requested reconnect' })
      this.reconnect(error)
      return
    }

    const request = this.requestManager.getPendingRequest(message.id)

    if (!request) return

    request.callbacks.next(message)

    let completed = true

    if ('result' in message && request.message.method === 'subscription') {
      if (message.result?.type === 'data') {
        request.message.params.lastEventId = message.result.id
      }

      if (message.result?.type !== 'stopped') {
        completed = false
      }
    }

    if (completed) {
      request.callbacks.complete()
      this.requestManager.delete(message.id)
    }
  }

  // private handleIncomingRequest(message: EdenWsReconnectResult) {
  //   if (message.type === 'reconnect') {
  //     const error = new EdenWebSocketClosedError({
  //       message: 'Server requested reconnect',
  //     })
  //     this.reconnect(error)
  //   }
  // }

  /**
   * Sends a message or batch of messages directly to the server.
   */
  private send(messageOrMessages: MaybeArray<EdenWsOutgoingMessage>) {
    if (!this.activeConnection.isOpen()) {
      throw new Error('Active connection is not open')
    }

    const messages = messageOrMessages instanceof Array ? messageOrMessages : [messageOrMessages]

    this.activeConnection.ws.send(JSON.stringify(messages.length === 1 ? messages[0] : messages))
  }

  /**
   * Groups requests for batch sending.
   *
   * @returns A function to abort the batched request.
   */
  private batchSend(message: EdenWsOutgoingMessage, callbacks: WebSocketRequestCallbacks) {
    this.inactivityTimeout.reset()

    this.#batchSend().catch((err) => {
      this.requestManager.delete(message.id)
      callbacks.error(err)
    })

    return this.requestManager.register(message, callbacks)
  }

  #batchSend = async () => {
    if (!this.activeConnection.isOpen()) {
      await this.open()
    }

    await sleep()

    if (!this.requestManager.hasOutgoingRequests()) return

    const requests = this.requestManager.flush()

    const messages = requests.map((request) => request.message)

    this.send(messages)
  }
}
