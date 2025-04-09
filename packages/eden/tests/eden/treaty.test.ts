import { Elysia } from 'elysia'
import { describe, expect, test } from 'vitest'

import { edenTreaty } from '../../src/eden/treaty'
import { httpBatchLink } from '../../src/links/http-batch-link'
import { httpLink } from '../../src/links/http-link'
import { batchPlugin } from '../../src/plugins/batch'
import { useApp } from '../setup'

describe('treaty', () => {
  test('basic HTTP networking works', async () => {
    const data = 'Hello, Elysia'

    const app = new Elysia().get('/', () => data)

    useApp(app)

    const treaty = edenTreaty<typeof app>('http://localhost:3000')

    const result = await treaty.index.get()

    expect(result.data).toBe(data)
  })

  test('custom path parameter separator works', async () => {
    const id = 'my-post-id'

    const app = new Elysia().get('/posts/:id', (context) => context.params.id)

    useApp(app)

    const treaty = edenTreaty<typeof app>('http://localhost:3000').types({ separator: '||param||' })

    const result = await treaty.posts['||id||'].get({ params: { id } })

    expect(result.data).toBe(id)
  })

  describe('link api works', () => {
    test('http link single request', async () => {
      const data = 'Hello, Elysia'

      const app = new Elysia().get('/', () => data)

      useApp(app)

      const treaty = edenTreaty<typeof app>('http://localhost:3000', { links: [httpLink()] })

      const result = await treaty.index.get()

      expect(result.data).toBe(data)
    })

    test('http batch link multiple requests', async () => {
      const datas = ['Hello, Elysia', 'Hello, Eden', 'Hello, Aponia']

      let i = 0

      const app = new Elysia().use(batchPlugin({ types: true })).get('/', () => datas[i++])

      useApp(app)

      const treaty = edenTreaty<typeof app>('http://localhost:3000', {
        links: [httpBatchLink({ types: true })],
      })

      const promises = datas.map(() => treaty.index.get())

      const results = await Promise.all(promises)

      expect(results).toHaveLength(datas.length)

      results.forEach((result, index) => {
        expect(result.data).toBe(datas[index])
      })
    })
  })
})
