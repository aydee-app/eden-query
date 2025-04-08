// @vitest-environment happy-dom

import { Elysia } from 'elysia'
import { EventSourcePolyfill, NativeEventSource } from 'event-source-polyfill'
import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import { httpSubscriptionLink } from '../../src/links/http-subscription-link'
import { useApp } from '../setup'

const EventSource: any = NativeEventSource || EventSourcePolyfill

global.EventSource = EventSource

function createIntervalIterable(interval = 1_000, limit = Infinity) {
  let counter = 0

  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          return new Promise<{ value?: number; done: boolean }>((resolve) => {
            if (counter >= limit) {
              resolve({ done: true })
              return
            }

            setTimeout(() => {
              counter++
              resolve({ value: counter, done: false })
            }, interval)
          })
        },
        return() {
          return Promise.resolve<{ value?: number; done: boolean }>({ done: true })
        },
      }
    },
  }
}

describe('httpSubscriptionLink', () => {
  test('connects to sse-compatible endpoint', async () => {
    const length = 5
    const interval = 500
    const timeout = length * interval * 2

    const enqueued: any[] = []

    const app = new Elysia().get('/', async function* () {
      const iterable = createIntervalIterable(interval, length)

      for await (const value of iterable) {
        enqueued.push(value)
        const data = JSON.stringify(value)
        yield `data:${data}\n\n`
      }
    })

    useApp(app)

    const client = new EdenClient<typeof app>({
      links: [
        httpSubscriptionLink({
          EventSource: EventSourcePolyfill,
          url: 'http://localhost:3000',
        }),
      ],
    })

    const onData = vi.fn()

    client.subscription('/', undefined, { onData })

    await vi.waitFor(() => expect(enqueued).toHaveLength(length), { timeout })

    enqueued.forEach((item, index) => {
      expect(onData).toHaveBeenNthCalledWith(index + 1, item)
    })
  })
})
