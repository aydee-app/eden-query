import { matchTransformer, sseStreamProducer } from '@ap0nia/eden'
import { transformPlugin } from '@ap0nia/eden/plugins'
import { Elysia, t } from 'elysia'
import SuperJSON from 'superjson'

function sleep(ms = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

const app = new Elysia()
  .use(transformPlugin({ types: true, transformer: SuperJSON, transformers: [] }))
  .get(
    '/',
    async function* (context) {
      // Elysia.js does not provide compatibility for server-sent events (SSE) out of the box.

      yield 'event: connected\ndata: "{}"\n\n'

      let i = context.query.lastEventId ?? 0

      for (; ; i++) {
        const information = tracked(String(i), i)

        const data = { data: information[1], id: information[0] }

        console.log({ data })

        // The transformPlugin stores configuration in the global store if `types` is enabled.
        const transform = context.store.eden.transform

        const transformer = matchTransformer(transform.transformers, transform.transformer)

        const serialized = transformer ? transformer?.output.serialize(data) : data

        yield `data: ${JSON.stringify(serialized)}\n\n`

        await sleep(1_000)
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
        let i = context.query.lastEventId ?? 0

        for (; ; i++) {
          const [id, data] = tracked(String(i), i)

          // It looks like tracked envelopes are handled by the adapter, not sseStreamProducer.
          // https://github.com/trpc/trpc/blob/a26b6120ca5503b96f914c3a8b91abf8fcffedc7/packages/server/src/adapters/ws.ts#L371-L378
          yield { data, id }

          await sleep()
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

app.listen(3000, (server) => console.log(`Listening on ${server.url}`))
