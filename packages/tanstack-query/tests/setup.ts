import '@testing-library/jest-dom'

import { JSDOM } from 'jsdom'

const dom = new JSDOM(undefined, {
  /**
   * @see https://github.com/jsdom/jsdom/issues/2319#issuecomment-855407924
   */
  url: 'http://localhost:3000',
})

// Happy-DOM XMLHttpRequest does not work with streamed responses for some reason...
// It does not read any text until the response completes.
global.XMLHttpRequest = dom.window.XMLHttpRequest

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
