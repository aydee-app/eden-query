import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import { wsLink } from '../../src/links/ws-link'
import { wsPlugin } from '../../src/plugins/ws'
import { WebSocketClient } from '../../src/ws/client'
import { createWsApp } from '../create-ws-app'
import { useApp } from '../setup'

/**
 * Sample origin.
 */
const origin = 'http://localhost'

describe.skip('adapter', () => {
  test('should work', async () => {
    const app = createWsApp(origin).ws('/ws', {
      message(ws, message) {
        ws.send(message)
      },
    })

    useApp(app)

    const websocket = new WebSocket(`${origin}/ws`)

    await new Promise((resolve) => {
      websocket.addEventListener('open', resolve)
    })

    const listener = vi.fn()

    websocket.addEventListener('message', listener)

    const message = 'PING'

    websocket.send(message)

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: message })),
    )
  })

  test('should not work', async () => {
    const websocket = new WebSocket(`${origin}/ws`)

    await new Promise((resolve) => {
      websocket.addEventListener('open', resolve)
    })

    const listener = vi.fn()

    websocket.addEventListener('message', listener)

    const message = 'PING'

    websocket.send(message)

    await expect(
      async () =>
        await vi.waitFor(() =>
          expect(listener).toHaveBeenCalledWith(expect.objectContaining({ data: message })),
        ),
    ).rejects.toThrow()
  })
})

describe('wsLink', async () => {
  test('works with batched request', async () => {
    const data = ['Hello, Elysia', 'Hello, Aponia', 'Hello, Eden']

    let i = 0

    const app = createWsApp(origin)
      .use(wsPlugin({ types: true }))
      .get('/', () => {
        return data[i++]
      })

    useApp(app)

    const client = new EdenClient<typeof app>({
      links: [
        wsLink({
          types: true,
          client: new WebSocketClient({
            url: `${origin}/ws`,
          }),
        }),
      ],
    })

    const request = client.query.bind(client, '/', undefined, undefined)

    const results = await Promise.all(data.map(request))

    results.forEach((result, index) => {
      expect(result.data).toBe(data[index])
    })
  })

  test('works with single request', async () => {
    const data = ['Hello, Elysia']

    let i = 0

    const app = createWsApp(origin)
      .use(wsPlugin({ types: true }))
      .get('/', () => {
        return data[i++]
      })

    useApp(app)

    const client = new EdenClient<typeof app>({
      links: [
        wsLink({
          types: true,
          client: new WebSocketClient({
            url: `${origin}/ws`,
          }),
        }),
      ],
    })

    const request = client.query.bind(client, '/', undefined, undefined)

    const results = await Promise.all(data.map(request))

    results.forEach((result, index) => {
      expect(result.data).toBe(data[index])
    })
  })

  test('works with headers', async () => {
    const data = ['Hello, Elysia', 'Hello, Aponia', 'Hello, Eden']

    const app = createWsApp(origin)
      .use(wsPlugin({ types: true }))
      .get('/', (context) => {
        return context.headers['index']
      })

    useApp(app)

    const client = new EdenClient<typeof app>({
      links: [
        wsLink({
          types: true,
          client: new WebSocketClient({
            url: `${origin}/ws`,
          }),
        }),
      ],
    })

    const requests = data.map(async (_item, index) => {
      return client.query('/', { headers: { index: index.toString() } })
    })

    const results = await Promise.all(requests)

    results.forEach((result, index) => {
      expect(result.data).toBe(index)
    })
  })
})
