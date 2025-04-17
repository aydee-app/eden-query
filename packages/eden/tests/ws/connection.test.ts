import { describe, expect, test, vi } from 'vitest'

import { WebSocketConnection } from '../../src/ws/connection'

describe('WebSocketConnection', () => {
  test('is open after open is called', async () => {
    const connection = new WebSocketConnection({
      url: {
        url: 'http://localhost:3000/ws',
      },
    })

    await connection.open()

    expect(connection.isOpen()).toBe(true)
    expect(connection.isClosed()).toBe(false)
  })

  test('is closed after close is called', async () => {
    const connection = new WebSocketConnection({
      url: {
        url: 'http://localhost:3000/ws',
      },
    })

    await connection.open()

    expect(connection.isOpen()).toBe(true)

    await connection.close()

    expect(connection.isOpen()).toBe(false)
    expect(connection.isClosed()).toBe(true)
  })

  test('only one WebSockdet is created at a time', async () => {
    const listener = vi.fn()

    class WS extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        listener()
        super(url, protocols)
      }
    }

    const connection = new WebSocketConnection({
      url: {
        url: 'http://localhost:3000/ws',
      },
      WebSocket: WS,
    })

    connection.open()
    connection.open()
    await connection.open()

    expect(connection.isOpen()).toBe(true)
    expect(connection.isClosed()).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  test('keep alive works correctly', async () => {
    const connection = new WebSocketConnection({
      url: {
        url: 'http://localhost:3000/ws',
      },
      keepAlive: {
        enabled: true,
        intervalMs: 1000,
        pongTimeoutMs: 1000,
      },
    })

    await connection.open()
  })
})
