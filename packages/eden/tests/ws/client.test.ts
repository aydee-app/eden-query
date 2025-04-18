import { describe, expect, test, vi } from 'vitest'

import {
  type EdenWebSocketIncomingMessage,
  type EdenWebSocketOutgoingMessage,
  WEBSOCKET_CONNECTION_STATES,
  WebSocketClient,
} from '../../src'
import { observableToPromise } from '../../src/observable'
import { createWsApp } from '../create-ws-app'
import { useApp } from '../setup'

const domain = 'http://localhost:3000'

const url = `${domain}/ws`

describe('WebSocketClient', () => {
  test('opens correctly', async () => {
    const app = createWsApp(domain).ws('/ws', {})

    useApp(app)

    const onOpen = vi.fn()

    const client = new WebSocketClient({ url, onOpen })

    await client.activeConnection.open()

    expect(onOpen).toHaveBeenCalledOnce()
  })

  test('sends messages correctly', async () => {
    const id = 0

    const listener = vi.fn()

    const expected: EdenWebSocketIncomingMessage = {
      id,
      result: {
        type: 'data',
        data: {
          elysia: 'aponia',
        },
        response: {} as any,
      },
    }

    const app = createWsApp(domain).ws('/ws', {
      message(ws, message) {
        listener(message)
        ws.send(expected)
      },
    })

    useApp(app)

    const onOpen = vi.fn()

    const client = new WebSocketClient({ url, onOpen })

    // Client will automatically wait until the connection is open before sending messages.
    // await client.activeConnection.open()

    const message = {
      id,
      method: 'query',
      params: {
        params: {},
      },
    } satisfies EdenWebSocketOutgoingMessage

    const request = client.request({
      op: {
        context: {},
        id,
        type: message.method,
        params: message.params.params,
      },
    })

    const result = await observableToPromise(request)

    expect(listener).toHaveBeenCalledExactlyOnceWith(message)
    expect(result).toStrictEqual(expected)
  })

  test('throws error if sending messages while connection is closed', async () => {
    const app = createWsApp(domain).ws('/ws', {})

    useApp(app)

    const client = new WebSocketClient({ url })

    expect(() => client.send({} as any)).toThrow()
  })

  test('sends array of multiple messages by default', async () => {
    const message = vi.fn()

    const app = createWsApp(domain).ws('/ws', { message })

    useApp(app)

    const client = new WebSocketClient({ url })

    const messages = [{ hello: 'world' }, { elysia: 'hi~~' }, { aponia: 'eden' }]

    await client.activeConnection.open()

    client.send(messages as any)

    await vi.waitFor(() =>
      expect(message).toHaveBeenCalledExactlyOnceWith(expect.anything(), messages),
    )
  })

  test('sends messages one-by-one if batching disabled', async () => {
    const message = vi.fn()

    const app = createWsApp(domain).ws('/ws', { message })

    useApp(app)

    const client = new WebSocketClient({ url, batch: false })

    const messages = [{ hello: 'world' }, { elysia: 'hi~~' }, { aponia: 'eden' }, 'trigger']

    await client.activeConnection.open()

    client.send(messages as any)

    await vi.waitFor(() => {
      messages.forEach((m, index) => {
        expect(message).toHaveBeenNthCalledWith(index + 1, expect.anything(), m)
      })
    })
  })

  test('only notifies for connecting state once', async () => {
    const next = vi.fn()

    const app = createWsApp(domain).ws('/ws', {})

    useApp(app)

    const client = new WebSocketClient({
      url,
      batch: false,
      lazy: { enabled: true, closeMs: 1_000 },
    })

    client.connectionState.subscribe({ next })

    client.open()
    client.open()

    await client.open()

    expect(next).toHaveBeenNthCalledWith(1, WEBSOCKET_CONNECTION_STATES.IDLE)
    expect(next).toHaveBeenNthCalledWith(2, WEBSOCKET_CONNECTION_STATES.CONNECTING)
    expect(next).toHaveBeenNthCalledWith(3, WEBSOCKET_CONNECTION_STATES.PENDING)

    expect(next.mock.calls.length).toBeLessThanOrEqual(3)
  })

  test('stops requests if any are pending when closed', async () => {
    const app = createWsApp(domain).ws('/ws', {})

    useApp(app)

    const client = new WebSocketClient({ url })

    await client.open()

    const request = client.request({
      op: {
        context: {},
        id: 0,
        type: 'query',
        params: {},
      },
    })

    await Promise.all([expect(observableToPromise(request)).rejects.toThrow(), client.close()])
  })
})
