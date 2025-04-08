import type { EdenWsConnectionParamsRequest } from '../core/dto'
import { behaviorSubject } from '../observable/behavior-subject'
import { resolveCallbackOrValue } from '../utils/callback-or-value'
import type { WebSocketUrlOptions } from './url'

/**
 * Opens a WebSocket connection asynchronously and returns a promise
 * that resolves when the connection is successfully established.
 * The promise rejects if an error occurs during the connection attempt.
 */
function asyncWsOpen(ws: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    ws.addEventListener('error', reject)

    ws.addEventListener('open', () => {
      ws.removeEventListener('error', reject)
      resolve()
    })
  })
}

interface PingPongOptions {
  /**
   * The interval (in milliseconds) between "PING" messages.
   */
  intervalMs: number

  /**
   * The timeout (in milliseconds) to wait for a "PONG" response before closing the connection.
   */
  pongTimeoutMs: number
}

/**
 * Sets up a periodic ping-pong mechanism to keep the WebSocket connection alive.
 *
 * - Sends "PING" messages at regular intervals defined by `intervalMs`.
 * - If a "PONG" response is not received within the `pongTimeoutMs`, the WebSocket is closed.
 * - The ping timer resets upon receiving any message to maintain activity.
 * - Automatically starts the ping process when the WebSocket connection is opened.
 * - Cleans up timers when the WebSocket is closed.
 *
 * @param ws - The WebSocket instance to manage.
 * @param options - Configuration options for ping-pong intervals and timeouts.
 */
function setupPingInterval(ws: WebSocket, options: PingPongOptions) {
  let pingTimeout: ReturnType<typeof setTimeout>
  let pongTimeout: ReturnType<typeof setTimeout>

  function start() {
    pingTimeout = setTimeout(() => {
      ws.send('PING')

      pongTimeout = setTimeout(() => {
        ws.close()
      }, options.pongTimeoutMs)
    }, options.intervalMs)
  }

  function reset() {
    clearTimeout(pingTimeout)
    start()
  }

  function pong() {
    clearTimeout(pongTimeout)
    reset()
  }

  ws.addEventListener('open', start)

  ws.addEventListener('message', (message) => {
    clearTimeout(pingTimeout)
    start()

    if (message.data === 'PONG') {
      pong()
    }
  })
  ws.addEventListener('close', () => {
    clearTimeout(pingTimeout)
    clearTimeout(pongTimeout)
  })
}

export interface KeepAliveOptions extends PingPongOptions {
  enabled: boolean
}

export interface WebSocketConnectionOptions {
  WebSocket?: typeof WebSocket

  url: WebSocketUrlOptions

  keepAlive?: KeepAliveOptions
}

/**
 * Manages a WebSocket connection with support for reconnection, keep-alive mechanisms,
 * and observable state tracking.
 */
export class WebSocketConnection {
  static connectCount = 0

  public id = ++WebSocketConnection.connectCount

  private readonly WebSocket: typeof WebSocket

  public readonly wsObservable = behaviorSubject<WebSocket>()

  /**
   * Manages the WebSocket opening process, ensuring that only one open operation
   * occurs at a time. Tracks the ongoing operation with `openPromise` to avoid
   * redundant calls and ensure proper synchronization.
   *
   * Sets up the keep-alive mechanism and necessary event listeners for the connection.
   *
   * @returns A promise that resolves once the WebSocket connection is successfully opened.
   */
  private openPromise?: Promise<void>

  constructor(public readonly options: WebSocketConnectionOptions) {
    this.WebSocket = options.WebSocket ?? WebSocket

    if (!this.WebSocket) {
      throw new Error(
        "No WebSocket implementation found - you probably don't want to use this on the server, but if you do you need to pass a `WebSocket`-ponyfill",
      )
    }
  }

  public get ws() {
    return this.wsObservable.get()
  }

  private set ws(ws) {
    this.wsObservable.next(ws)
  }

  #open = async () => {
    const urlOptions = this.options.url

    const url = await resolveCallbackOrValue(urlOptions.url)

    const ws = new this.WebSocket(url)

    this.ws = ws

    ws.addEventListener('message', function ({ data }) {
      if (data === 'PING') {
        this.send('PONG')
      }
    })

    if (this.options.keepAlive?.enabled) {
      setupPingInterval(ws, this.options.keepAlive)
    }

    ws.addEventListener('close', () => {
      if (this.ws === ws) {
        this.ws = undefined
      }
    })

    await asyncWsOpen(ws)

    if (!urlOptions.connectionParams) return

    const connectionParams = await resolveCallbackOrValue(urlOptions.connectionParams)

    const message: EdenWsConnectionParamsRequest = {
      method: 'connection-params',
      params: connectionParams,
    }

    ws.send(JSON.stringify(message))
  }

  /**
   * Checks if the WebSocket connection is open and ready to communicate.
   */
  public isOpen(): this is { ws: WebSocket } {
    return !!this.ws && this.ws.readyState === this.WebSocket.OPEN && !this.openPromise
  }

  /**
   * Checks if the WebSocket connection is closed or in the process of closing.
   */
  public isClosed(): this is { ws: WebSocket } {
    return (
      !!this.ws &&
      (this.ws.readyState === this.WebSocket.CLOSING ||
        this.ws.readyState === this.WebSocket.CLOSED)
    )
  }

  public async open() {
    if (this.openPromise) return this.openPromise

    this.id = ++WebSocketConnection.connectCount

    this.openPromise = this.#open()

    try {
      await this.openPromise
    } finally {
      this.openPromise = undefined
    }
  }

  /**
   * Closes the WebSocket connection gracefully.
   * Waits for any ongoing open operation to complete before closing.
   */
  public async close() {
    try {
      await this.openPromise
    } finally {
      this.ws?.close()
    }
  }
}

/**
 * Provides a backward-compatible representation of the connection state.
 */
export function backwardCompatibility(connection: WebSocketConnection) {
  if (connection.isOpen()) {
    return {
      id: connection.id,
      state: 'open',
      ws: connection.ws,
    } as const
  }

  if (connection.isClosed()) {
    return {
      id: connection.id,
      state: 'closed',
      ws: connection.ws,
    } as const
  }

  if (!connection.ws) return null

  return {
    id: connection.id,
    state: 'connecting',
    ws: connection.ws,
  } as const
}
