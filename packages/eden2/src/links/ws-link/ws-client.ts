import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../../core/errors'
import type { CombinedDataTransformer } from '../../core/transformer'
import { type BehaviorSubject, behaviorSubject } from '../internal/behavior-subject'
import { Observable } from '../internal/observable'
import type {
  EdenClientIncomingMessage,
  EdenClientIncomingRequest,
  EdenClientOutgoingMessage,
  EdenResponseMessage,
  Operation,
  OperationResultEnvelope,
} from '../internal/operation'
import type { EdenConnectionState } from '../internal/subscription'
import {
  exponentialBackoff,
  keepAliveDefaults,
  lazyDefaults,
  type WebSocketClientOptions,
} from './options'
import { RequestManager, type TCallbacks } from './request-manager'
import { ResettableTimeout, run, sleep, TRPCWebSocketClosedError } from './utils'
import { backwardCompatibility, WsConnection } from './ws-connection'

/**
 * A WebSocket client for managing TRPC operations, supporting lazy initialization,
 * reconnection, keep-alive, and request management.
 */
export class WsClient {
  /**
   * Observable tracking the current connection state, including errors.
   */
  public readonly connectionState: BehaviorSubject<EdenConnectionState<EdenClientError<AnyElysia>>>

  private allowReconnect = false
  private requestManager = new RequestManager()
  private readonly activeConnection: WsConnection
  private readonly reconnectRetryDelay: (attemptIndex: number) => number
  private inactivityTimeout: ResettableTimeout
  private readonly callbacks: Pick<WebSocketClientOptions, 'onOpen' | 'onClose' | 'onError'>
  private readonly lazyMode: boolean

  constructor(opts: WebSocketClientOptions) {
    // Initialize callbacks, connection parameters, and options.
    this.callbacks = {
      onOpen: opts.onOpen,
      onClose: opts.onClose,
      onError: opts.onError,
    }

    const lazyOptions = {
      ...lazyDefaults,
      ...opts.lazy,
    }

    // Set up inactivity timeout for lazy connections.
    this.inactivityTimeout = new ResettableTimeout(() => {
      if (this.requestManager.hasOutgoingRequests() || this.requestManager.hasPendingRequests()) {
        this.inactivityTimeout.reset()
        return
      }

      this.close().catch(() => null)
    }, lazyOptions.closeMs)

    // Initialize the WebSocket connection.
    this.activeConnection = new WsConnection({
      WebSocketPonyfill: opts.WebSocket,
      urlOptions: opts,
      keepAlive: {
        ...keepAliveDefaults,
        ...opts.keepAlive,
      },
    })

    this.activeConnection.wsObservable.subscribe({
      next: (ws) => {
        if (!ws) return
        this.setupWebSocketListeners(ws)
      },
    })

    this.reconnectRetryDelay = opts.retryDelayMs ?? exponentialBackoff

    this.lazyMode = lazyOptions.enabled

    this.connectionState = behaviorSubject<EdenConnectionState<EdenClientError<AnyElysia>>>({
      type: 'state',
      state: lazyOptions.enabled ? 'idle' : 'connecting',
      error: null,
    })

    // Automatically open the connection if lazy mode is disabled.
    if (!this.lazyMode) {
      this.open().catch(() => null)
    }
  }

  /**
   * Opens the WebSocket connection. Handles reconnection attempts and updates
   * the connection state accordingly.
   */
  private async open() {
    this.allowReconnect = true

    if (this.connectionState.get().state !== 'connecting') {
      this.connectionState.next({
        type: 'state',
        state: 'connecting',
        error: null,
      })
    }

    try {
      await this.activeConnection.open()
    } catch (error) {
      const err = new TRPCWebSocketClosedError({
        message: 'Initialization error',
        cause: error,
      })

      this.reconnect(err)

      return this.reconnecting
    }
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
        const err = TRPCClientError.from(
          new TRPCWebSocketClosedError({
            message: 'Closed before connection was established',
          }),
        )

        request.callbacks.error(err)

        continue
      }

      requestsToAwait.push(request.end)
    }

    await Promise.all(requestsToAwait).catch(() => null)
    await this.activeConnection.close().catch(() => null)

    this.connectionState.next({ type: 'state', state: 'idle', error: null })
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
  public request({
    op,
    transformer,
    lastEventId,
  }: {
    op: Operation
    transformer: CombinedDataTransformer
    lastEventId?: string
  }) {
    const message: EdenClientOutgoingMessage = {
      id: op.id,
      method: op.type,
      params: {
        input: transformer.input.serialize(op.params),
        // params: transformer.input.serialize(op.params),
        path: op.path,
        lastEventId,
      },
    }

    type TValue = OperationResultEnvelope<unknown, EdenClientError<AnyElysia>>
    type TError = EdenClientError<AnyElysia>

    const observable = new Observable<TValue, TError>((observer) => {
      const callbacks: TCallbacks = {
        ...observer,
        next(event) {
          if ('error' in event) {
            console.log(event.error)
          } else {
            console.log(event.result)
          }

          const transformed = transformResult(event, transformer.output)

          if (!transformed.ok) {
            observer.error(TRPCClientError.from(transformed.error))
            return
          }

          observer.next({
            result: transformed.result,
          })
        },
      }

      const abort = this.batchSend(message, callbacks)

      return () => {
        abort()

        if (op.type === 'subscription' && this.activeConnection.isOpen()) {
          const message: EdenClientOutgoingMessage = {
            id: op.id,
            method: 'subscription.stop',
          }

          this.send(message)
        }

        op.signal?.removeEventListener('abort', abort)
      }
    })

    return observable
  }

  public get connection() {
    return backwardCompatibility(this.activeConnection)
  }

  /**
   * Manages the reconnection process for the WebSocket using retry logic.
   * Ensures that only one reconnection attempt is active at a time by tracking the current
   * reconnection state in the `reconnecting` promise.
   */
  private reconnecting: Promise<void> | null = null

  private reconnect(closedError: TRPCWebSocketClosedError) {
    const error: EdenConnectionState<EdenClientError<AnyElysia>> = {
      type: 'state',
      state: 'connecting',
      error: TRPCClientError.from(closedError),
    }

    this.connectionState.next(error)

    if (this.reconnecting) return

    const tryReconnect = async (attemptIndex: number) => {
      try {
        await sleep(this.reconnectRetryDelay(attemptIndex))

        if (this.allowReconnect) {
          await this.activeConnection.close()
          await this.activeConnection.open()

          if (this.requestManager.hasPendingRequests()) {
            const pendingRequests = this.requestManager.getPendingRequests()
            const messages = pendingRequests.map(({ message }) => message)
            this.send(messages)
          }
        }
        this.reconnecting = null
      } catch {
        await tryReconnect(attemptIndex + 1)
      }
    }

    this.reconnecting = tryReconnect(0)
  }

  private setupWebSocketListeners(ws: WebSocket) {
    const handleCloseOrError = (cause: unknown) => {
      const reqs = this.requestManager.getPendingRequests()

      for (const { message, callbacks } of reqs) {
        if (message.method === 'subscription') continue

        const err =
          cause ??
          new TRPCWebSocketClosedError({
            message: 'WebSocket closed',
            cause,
          })

        callbacks.error(TRPCClientError.from(err))

        this.requestManager.delete(message.id)
      }
    }

    ws.addEventListener('open', () => {
      run(async () => {
        if (this.lazyMode) {
          this.inactivityTimeout.start()
        }

        this.callbacks.onOpen?.()

        this.connectionState.next({
          type: 'state',
          state: 'pending',
          error: null,
        })
      }).catch((error) => {
        ws.close(3000)
        handleCloseOrError(error)
      })
    })

    ws.addEventListener('message', ({ data }) => {
      this.inactivityTimeout.reset()

      if (typeof data !== 'string' || ['PING', 'PONG'].includes(data)) return

      const incomingMessage = JSON.parse(data) as EdenClientIncomingMessage

      if ('method' in incomingMessage) {
        this.handleIncomingRequest(incomingMessage)
        return
      }

      this.handleResponseMessage(incomingMessage)
    })

    ws.addEventListener('close', (event) => {
      handleCloseOrError(event)
      this.callbacks.onClose?.(event)

      if (!this.lazyMode) {
        const error = new TRPCWebSocketClosedError({
          message: 'WebSocket closed',
          cause: event,
        })

        this.reconnect(error)
      }
    })

    ws.addEventListener('error', (event) => {
      handleCloseOrError(event)
      this.callbacks.onError?.(event)

      const error = new TRPCWebSocketClosedError({
        message: 'WebSocket closed',
        cause: event,
      })

      this.reconnect(error)
    })
  }

  private handleResponseMessage(message: EdenResponseMessage) {
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

  private handleIncomingRequest(message: EdenClientIncomingRequest) {
    if (message.method === 'reconnect') {
      const error = new TRPCWebSocketClosedError({
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
  private batchSend(message: EdenClientOutgoingMessage, callbacks: TCallbacks) {
    this.inactivityTimeout.reset()

    run(async () => {
      if (!this.activeConnection.isOpen()) {
        await this.open()
      }

      await sleep(0)

      if (!this.requestManager.hasOutgoingRequests()) return

      this.send(this.requestManager.flush().map(({ message }) => message))
    }).catch((err) => {
      this.requestManager.delete(message.id)
      callbacks.error(TRPCClientError.from(err))
    })

    return this.requestManager.register(message, callbacks)
  }
}
