import { setup } from '@ark/attest'
import type { AnyElysia } from 'elysia'
import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

setup({})

/**
 * @see https://vitest.dev/guide/mocking#requests
 */
export const server = setupServer()

export function useApp(app: AnyElysia) {
  const proxy = http.all('*', async (info) => {
    // const request = info.request.clone()
    const response = await app.handle(info.request)
    return response
  })

  server.use(proxy)
}

// Start server before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))

//  Close server after all tests.
afterAll(() => server.close())

// Reset handlers after each test `important for test isolation`.
afterEach(() => server.resetHandlers())
