/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { app } from './app'

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
