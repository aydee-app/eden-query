import { edenTreaty, httpBatchLink } from '@ap0nia/eden'
import { batchPlugin } from '@ap0nia/eden/plugins'
import { Elysia, t } from 'elysia'
import { afterEach,expect, test, vi } from 'vitest'

import { useApp } from '../setup'

const onRequestSpy = vi.fn()

const batchedKey = 'batched'

const app = new Elysia()
  .onRequest((context) => {
    if (context.request.headers.get(batchedKey) == null) onRequestSpy(context)
  })
  .get('/hello', (context) => `Hello ${context.query.input ?? 'world'}`, {
    query: t.Object({
      input: t.Optional(t.String()),
    }),
  })

type App = typeof app

afterEach(() => {
  onRequestSpy.mockClear()
})

test('batching enabled', async () => {
  const appWithBatching = new Elysia()
    .use(batchPlugin({ types: true, headers: { [batchedKey]: 'true' } }))
    .use(app)

  const client = edenTreaty<typeof appWithBatching>(undefined, {
    links: [httpBatchLink({ types: true, method: 'GET' })],
  })

  useApp(appWithBatching)

  const results = await Promise.all([
    client.hello.get({ query: { input: '1' } }).then((r) => r.data),
    client.hello.get({ query: { input: '2' } }).then((r) => r.data),
  ])

  expect(results).toMatchInlineSnapshot(`
      [
        "Hello 1",
        "Hello 2",
      ]
    `)

  expect(onRequestSpy).toHaveBeenCalledTimes(1)

  expect(onRequestSpy.mock.calls[0]![0].url).toMatchInlineSnapshot(
    `"http://localhost:3000/batch?0.path=%2Fhello&0.query.input=1&1.path=%2Fhello&1.query.input=2"`,
  )
})

test('batching disabled', async () => {
  const client = edenTreaty<App>(undefined, {
    links: [
      // @ts-expect-error This test should error because batching is not enabled.
      httpBatchLink({ types: true, method: 'GET' }),
    ],
  })

  useApp(app)

  const promises = [
    client.hello.get({ query: { input: '1' } }).then((r) => r.data),
    client.hello.get({ query: { input: '2' } }).then((r) => r.data),
  ]

  await expect(Promise.all(promises)).rejects.toThrow(
    expect.objectContaining({
      message: 'Batching is not enabled on the server',
      data: expect.objectContaining({
        code: 'BAD_REQUEST',
        status: 400,
      }),
    }),
  )

  expect(onRequestSpy).toHaveBeenCalledTimes(1)

  expect(onRequestSpy.mock.calls[0]![0].url).toMatchInlineSnapshot(
    `"http://localhost:3000/batch?0.path=%2Fhello&0.query.input=1&1.path=%2Fhello&1.query.input=2"`,
  )
})

/**
 * @deprecated
 */
test('batching disabled (deprecated)', async () => {
  const client = edenTreaty<App>(undefined, {
    links: [
      // @ts-expect-error This test should error because batching is not enabled.
      httpBatchLink({ types: true, method: 'GET' }),
    ],
  })

  useApp(app)

  const promises = [
    client.hello.get({ query: { input: '1' } }).then((r) => r.data),
    client.hello.get({ query: { input: '2' } }).then((r) => r.data),
  ]

  await expect(Promise.all(promises)).rejects.toThrow(
    expect.objectContaining({
      data: expect.objectContaining({
        code: 'BAD_REQUEST',
      }),
    }),
  )
})
