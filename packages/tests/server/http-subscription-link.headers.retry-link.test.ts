import {
  EdenClient,
  type EdenLink,
  EdenServerError,
  httpBatchStreamLink,
  httpSubscriptionLink,
  matchTransformer,
  Observable,
  retryLink,
  splitLink,
  sseStreamProducer,
} from '@ap0nia/eden'
import { transformPlugin } from '@ap0nia/eden/plugins'
import { Elysia, t } from 'elysia'
import { EventSourcePolyfill, NativeEventSource } from 'event-source-polyfill'
import SuperJSON from 'superjson'
import { assert, expect, test, vi } from 'vitest'

import { useApp } from '../setup'

const EventSourcePonyfill: any = NativeEventSource || EventSourcePolyfill

global.EventSource = EventSourcePonyfill

function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const query = t.Object({
  lastEventId: t.Optional(t.Number()),
})

const trackedSymbol = Symbol()

type TrackedId = string & {
  __brand: 'TrackedId'
}

export type TrackedEnvelope<T> = [TrackedId, T, typeof trackedSymbol]

/**
 * Automatically track an event so that it can be resumed from a given id if the connection is lost
 */
export function tracked<TData>(id: string, data: TData): TrackedEnvelope<TData> {
  if (id === '') {
    // This limitation could be removed by using different SSE event names / channels for tracked event and non-tracked event
    throw new Error(
      '`id` must not be an empty string as empty string is the same as not setting the id at all',
    )
  }
  return [id as TrackedId, data, trackedSymbol]
}

// This is the heart of the test, the client will send this along and the server
// will increment it on each createContext(). If the latest version is
// always sent then the server will always receive the latest version
let incrementingTestHeader = 1

const onIterableInfiniteSpy = vi.fn<(args: typeof query.static) => void>()

const infiniteYields = vi.fn()

// const ee = new EventEmitter()

// const eeEmit = (data: number | Error) => {
//   ee.emit('data', data)
// }

const orderedResults: number[] = []

orderedResults.length = 0

const app = new Elysia()
  .onRequest((context) => {
    const expectedHeader = `x-test: ${incrementingTestHeader}`
    const receivedHeader = `x-test: ${context.request.headers.get('x-test')}`

    if (expectedHeader !== receivedHeader) {
      throw new EdenServerError({
        code: 'UNAUTHORIZED',
        message: 'x-test header mismatch. this means the test has failed',
      })
    }

    // Increment header so next time a connection is made we expect this version
    incrementingTestHeader++
  })
  .use(transformPlugin({ types: true, transformer: SuperJSON, transformers: [] }))
  .get(
    '/',
    async function* (context) {
      // Elysia.js does not provide compatibility for server-sent events (SSE) out of the box.

      yield 'event: connected\ndata: "{}"\n\n'

      onIterableInfiniteSpy(context.query)

      let i = context.query.lastEventId ?? 0

      for (; ; i++) {
        const information = tracked(String(i), i)

        const data = { data: information[1], id: information[0] }

        // The transformPlugin stores configuration in the global store if `types` is enabled.
        const transform = context.store.eden.transform

        const transformer = matchTransformer(transform.transformers, transform.transformer)

        const serialized = transformer ? transformer?.output.serialize(data) : data

        yield `data: ${JSON.stringify(serialized)}\n\n`

        await sleep()

        infiniteYields()
      }
    },
    {
      query: t.Object({
        lastEventId: t.Optional(t.Number()),
      }),
    },
  )
  .get(
    '/trpc',
    async (context) => {
      async function* data() {
        onIterableInfiniteSpy(context.query)

        let i = context.query.lastEventId ?? 0

        for (; ; i++) {
          const [id, data] = tracked(String(i), i)

          // It looks like tracked envelopes are handled by the adapter, not sseStreamProducer.
          // https://github.com/trpc/trpc/blob/a26b6120ca5503b96f914c3a8b91abf8fcffedc7/packages/server/src/adapters/ws.ts#L371-L378
          yield { data, id }

          await sleep()

          infiniteYields()
        }
      }

      const stream = sseStreamProducer({
        data: data(),
        serialize: context.store.eden.transform.transformer.serialize,
      })

      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
    },
    {
      query: t.Object({
        lastEventId: t.Optional(t.Number()),
      }),
    },
  )

const linkSpy: EdenLink = () => {
  // here we just got initialized in the app - this happens once per app
  // useful for storing cache for instance
  return ({ next, op }) => {
    // this is when passing the result to the next link
    // each link needs to return an observable which propagates results
    return new Observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          orderedResults.push(value.result.data as number)
          observer.next(value)
        },
        error: observer.error,
      })
      return unsubscribe
    })
  }
}

test('disconnect and reconnect with updated headers', async () => {
  useApp(app)

  const client = new EdenClient<typeof app>({
    links: [
      linkSpy,
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: [
          retryLink({
            retry(opts) {
              const { error } = opts

              const code = error.data?.code

              if (!code) {
                return false
              }

              if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
                // console.log('Restarting EventSource due to 401/403 error');
                return true
              }

              return false
            },
          }),
          httpSubscriptionLink({
            types: true,
            url: 'http://localhost:3000',
            transformer: SuperJSON,
            EventSource: EventSourcePolyfill,
            eventSourceOptions() {
              return {
                headers: {
                  transformed: 'true',
                  'x-test': String(incrementingTestHeader),
                },
              }
            },
          }),
        ],
        false: httpBatchStreamLink({
          transformer: SuperJSON,
        }),
      }),
    ],
  })

  // const h = vi.fn()

  // const e = new EventSourcePolyfill('http://localhost:3000')

  // e.addEventListener('message', (event) => {
  //   console.log(event)
  //   h()
  // })

  // await vi.waitFor(() => expect(h).toBeCalledTimes(5))

  const onStarted = vi.fn<(args: { context: Record<string, unknown> | undefined }) => void>()

  const aggregate: number[] = []

  const onData = vi.fn<(args: { data: number; id: string }) => void>(({ data }) => {
    aggregate.push(data)
  })

  const subscription = client.subscription('/trpc', undefined, { onStarted, onData })

  await vi.waitFor(() => {
    expect(onStarted).toHaveBeenCalled()
  })

  function getEventSource() {
    const lastCall = onStarted.mock.calls.at(-1)!

    // @ts-expect-error lint makes this accessing annoying
    const es = lastCall[0].context?.eventSource

    assert(es instanceof EventSource)

    return es
  }

  await vi.waitFor(() => {
    expect(onData.mock.calls.length).toBeGreaterThan(5)
  })

  expect(onData.mock.calls[0]![0]).toEqual({
    data: 0,
    id: '0',
  })

  expect(onIterableInfiniteSpy).toHaveBeenCalledTimes(1)

  expect(onStarted).toHaveBeenCalledTimes(1)
  expect(getEventSource().readyState).toBe(EventSource.OPEN)

  subscription.unsubscribe()

  expect(getEventSource().readyState).toBe(EventSource.CLOSED)

  // const lastEventId = onData.mock.calls.at(-1)?.[0]?.id

  // await vi.waitFor(() => {
  //   expect(onReqAborted).toHaveBeenCalledTimes(1)
  // })

  await sleep(50)

  infiniteYields.mockClear()
  await sleep(50)
  // expect(infiniteYields).toHaveBeenCalledTimes(0)

  // Find numbers that appear more than once in the data
  const numbers = onData.mock.calls.map((call) => call[0].data)
  const duplicates = numbers.filter((num, index) => numbers.indexOf(num) !== index)
  const uniqueDuplicates = [...new Set(duplicates)]
  expect(uniqueDuplicates).toEqual([])
})
