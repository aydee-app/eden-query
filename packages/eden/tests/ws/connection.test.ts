import { describe, expect, test, vi } from 'vitest'

import type { EdenWebSocketConnectionParamsRequest } from '../../src/core/dto'
import { WebSocketConnection } from '../../src/ws/connection'
import { createWsApp } from '../create-ws-app'
import { useApp } from '../setup'

const domain = 'http://localhost:3000'

const url = `${domain}/ws`

describe('WebSocketConnection', () => {
  test('is open after open is called', async () => {
    const connection = new WebSocketConnection({ url: { url } })

    await connection.open()

    expect(connection.isOpen()).toBe(true)
    expect(connection.isClosed()).toBe(false)
  })

  test('is closed after close is called', async () => {
    const connection = new WebSocketConnection({ url: { url } })

    await connection.open()

    expect(connection.isOpen()).toBe(true)

    await connection.close()

    expect(connection.isOpen()).toBe(false)
    expect(connection.isClosed()).toBe(true)
  })

  test('only one WebSocket is created at a time', async () => {
    const listener = vi.fn()

    class WS extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        listener()
        super(url, protocols)
      }
    }

    const connection = new WebSocketConnection({ url: { url }, WebSocket: WS })

    connection.open()
    connection.open()
    await connection.open()

    expect(connection.isOpen()).toBe(true)
    expect(connection.isClosed()).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  test('keep alive sends initial ping', async () => {
    const message = vi.fn()

    const app = createWsApp(domain).ws('/ws', { message })

    useApp(app)

    const connection = new WebSocketConnection({
      url: {
        url,
      },
      keepAlive: {
        enabled: true,
        intervalMs: 100,
        pongTimeoutMs: 1000,
      },
    })

    await connection.open()

    await vi.waitFor(() =>
      expect(message).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'PING'),
    )
  })

  test('connection responds with pong', async () => {
    const pongListener = vi.fn()

    const pingListener = vi.fn()

    const app = createWsApp(domain).ws('/ws', {
      message(ws, message) {
        if (message === 'PING') {
          pingListener(message)
          ws.send('PONG')
          ws.send('PING')
        } else {
          pongListener(message)
        }
      },
    })

    useApp(app)

    const connection = new WebSocketConnection({
      url: {
        url,
      },
      keepAlive: {
        enabled: true,
        intervalMs: 100,
        pongTimeoutMs: 1000,
      },
    })

    await connection.open()

    await vi.waitFor(() => expect(pingListener).toHaveBeenCalledWith('PING'))
    await vi.waitFor(() => expect(pongListener).toHaveBeenCalledWith('PONG'))
  })

  test('disconnects if pong takes too long', async () => {
    vi.useFakeTimers()

    const pongListener = vi.fn()

    const pingListener = vi.fn()

    const pongTimeoutMs = 1000

    const app = createWsApp(domain).ws('/ws', {
      async message(ws, message) {
        if (message === 'PING') {
          pingListener(message)
          await new Promise((resolve) => setTimeout(resolve, pongTimeoutMs))
          ws.send('PONG')
          ws.send('PING')
        } else {
          pongListener(message)
        }
      },
    })

    useApp(app)

    const connection = new WebSocketConnection({
      url: {
        url,
      },
      keepAlive: {
        enabled: true,
        intervalMs: 100,
        pongTimeoutMs: 100,
      },
    })

    await connection.open()

    await vi.waitFor(() => expect(pingListener).toHaveBeenCalledWith('PING'))

    await vi.advanceTimersByTimeAsync(pongTimeoutMs)

    expect(connection.isClosed()).toBe(true)

    expect(pongListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  test('sends connection params', async () => {
    vi.useFakeTimers()

    const message = vi.fn()

    const app = createWsApp(domain).ws('/ws', { message })

    useApp(app)

    const connectionParams = {
      elysia: 'aponia',
      eden: 'music',
      pardofelis: 'money',
    }

    const connection = new WebSocketConnection({
      url: {
        url,
        connectionParams,
      },
    })

    await connection.open()

    const request: EdenWebSocketConnectionParamsRequest = {
      method: 'connection-params',
      params: connectionParams,
    }

    expect(message).toHaveBeenCalledWith(expect.anything(), request)
  })
})
