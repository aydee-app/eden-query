import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect } from 'bun:test'
import { http } from 'msw'
import { setupServer } from 'msw/native'

import { app } from './app'

expect.extend(matchers)

afterEach(cleanup)

const proxy = http.all('*', async (info) => {
  const request = info.request.clone()
  const response = await app.handle(request)
  return response
})

/**
 * @see https://vitest.dev/guide/mocking#requests
 */
export const server = setupServer(proxy)

// Start server before all tests.
beforeAll(server.listen.bind(server, { onUnhandledRequest: 'error' }))

//  Close server after all tests.
afterAll(server.close.bind(server))

// Reset handlers after each test `important for test isolation`.
afterEach(() => server.resetHandlers())

afterEach(cleanup)
