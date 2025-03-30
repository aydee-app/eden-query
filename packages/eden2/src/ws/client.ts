import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../core/errors'
import type { EdenConnectionState, Operation } from '../links/internal/operation'
import { type BehaviorSubject, behaviorSubject, Observable } from '../observable'
import type { CombinedDataTransformer } from '../trpc/server/transformer'
import { ResettableTimeout } from '../utils/resettable-timeout'
import { sleep } from '../utils/sleep'
import { backwardCompatibility, type KeepAliveOptions, WebSocketConnection } from './connection'
import { EdenWebSocketClosedError } from './error'
import {
  type EdenClientOutgoingMessage,
  type EdenIncomingMessage,
  type EdenReconnectRequest,
  RequestManager,
  type WebSocketRequestCallbacks,
} from './request-manager'
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
  transformer?: CombinedDataTransformer
  lastEventId?: string
}

export type WebSocketConnectionState = EdenConnectionState<EdenClientError<AnyElysia>>

export const WEBSOCKET_CONNECTION_STATES = {
  CONNECTING: {
    type: 'state',
    state: 'connecting',
    error: null,
  },
  IDLE: {
    type: 'state',
    state: 'idle',
    error: null,
  },
  PENDING: {
    type: 'state',
    state: 'pending',
    error: null,
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
  public readonly connectionState: BehaviorSubject<EdenConnectionState<EdenClientError<AnyElysia>>>

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
   */
  public request(options: WebSocketRequestOptions) {
    const { op, lastEventId } = options

    const { id, type, params, signal } = op

    return new Observable<EdenIncomingMessage, EdenClientError<AnyElysia>>((observer) => {
      const abort = this.batchSend(
        {
          id,
          method: type,
          params: {
            params,
            type,
            lastEventId,
          },
        },
        {
          ...observer,
          next(event) {
            console.log({ event })
            observer.next(event)

            // const transformed = transformResult(event, transformer.output)

            // if (!transformed.ok) {
            //   observer.error(TRPCClientError.from(transformed.error))
            //   return
            // }

            // observer.next({
            //   result: transformed.result,
            // })
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

    ws.addEventListener('message', (message) => {
      this.inactivityTimeout.reset()

      if (typeof message.data !== 'string' || ['PING', 'PONG'].includes(message.data)) return

      const incomingMessage = JSON.parse(message.data) as EdenIncomingMessage

      if ('method' in incomingMessage) {
        this.handleIncomingRequest(incomingMessage)
      } else {
        this.handleResponseMessage(incomingMessage)
      }
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

  private handleResponseMessage(message: EdenIncomingMessage) {
    const request = this.requestManager.getPendingRequest(message.id)

    if (!request) return

    request.callbacks.next(message)

    let completed = true

    if ('result' in message && request.message.method === 'subscription') {
      if (message.result.type === 'data') {
        request.message.params.lastEventId = message.result.id
      }

      if (message.result.type !== 'stopped') {
        completed = false
      }
    }

    if (completed) {
      request.callbacks.complete()
      this.requestManager.delete(message.id)
    }
  }

  private handleIncomingRequest(message: EdenReconnectRequest) {
    if (message.method === 'reconnect') {
      const error = new EdenWebSocketClosedError({
        message: 'Server requested reconnect',
      })
      this.reconnect(error)
    }
  }

  /**
   * Sends a message or batch of messages directly to the server.
   */
  private send(messageOrMessages: EdenClientOutgoingMessage | EdenClientOutgoingMessage[]) {
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
  private batchSend(message: EdenClientOutgoingMessage, callbacks: WebSocketRequestCallbacks) {
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
