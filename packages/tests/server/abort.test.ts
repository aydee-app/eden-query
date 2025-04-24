import { edenTreaty } from '@ap0nia/eden'
import { Elysia } from 'elysia'
import { describe, expect,test } from 'vitest'

import { useApp } from '../setup'

const app = new Elysia().get('/test', 'hello').post('/test', 'hello')

type App = typeof app

describe('vanilla client procedure abortion', () => {
  test('query', async () => {
    const abortController = new AbortController()
    const signal = abortController.signal

    useApp(app)

    const client = edenTreaty<App>()

    const promise = client.test.get(undefined, { fetch: { signal } })

    abortController.abort()

    await expect(promise).rejects.toThrowError(/aborted/)
  })

  test('mutation', async () => {
    const abortController = new AbortController()
    const signal = abortController.signal

    useApp(app)

    const client = edenTreaty<App>()

    const promise = client.test.post(undefined, undefined, { fetch: { signal } })

    abortController.abort()

    await expect(promise).rejects.toThrowError(/aborted/)
  })
})
