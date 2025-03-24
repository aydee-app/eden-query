import { http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { app } from './app'

const proxy = http.all('*', async (info) => {
  const request = info.request.clone()
  const response = await app.handle(request)
  return response
})

const server = setupServer(proxy)

// server.events.on('request:start', ({ request }) => {
//   console.log('Outgoing:', request.method, request.url)
// })

// Start server before all tests
beforeAll(() => server.listen())

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())
