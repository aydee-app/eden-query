import { describe, expect, test, vi } from 'vitest'

import { EdenClient } from '../../src/client'
import type { EdenRequestHeaders } from '../../src/core/headers'
import { resolveEdenRequest } from '../../src/core/resolve'
import { httpLink, type HTTPLinkHeaders } from '../../src/links/http-link'

vi.mock('../../src/core/resolve', { spy: true })

describe('http-link', () => {
  describe('parameter propagation', () => {
    describe('headers', () => {
      test('resolves object option headers', async () => {
        const fetcher = vi.fn()

        const link = httpLink({ domain: 'http://localhost:3000', fetcher })

        const headers: EdenRequestHeaders = {
          auth: 'my-auth-token',
        }

        const client = new EdenClient({ links: [link] })

        await client.query('', { headers }).catch(() => {})

        expect(fetcher).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining(headers),
          }),
        )
      })

      test('resolves function option headers', async () => {
        const fetcher = vi.fn()

        const link = httpLink({ domain: 'http://localhost:3000', fetcher })

        const headersResult: EdenRequestHeaders = {
          auth: 'my-auth-token',
        }

        const headers: EdenRequestHeaders = (_params) => {
          return headersResult
        }

        const client = new EdenClient({ links: [link] })

        await client.query('', { headers }).catch(() => {})

        expect(fetcher).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining(headersResult),
          }),
        )
      })

      test('resolves array of function option headers', async () => {
        const fetcher = vi.fn()

        const link = httpLink({ domain: 'http://localhost:3000', fetcher })

        const headersResults = {
          1: 'Hello',
          2: 'Hello',
          3: 'Hello',
        }

        const headers: EdenRequestHeaders = Object.entries(headersResults).map((result) => {
          return () => {
            return {
              [result[0]]: result[1],
            }
          }
        })

        const client = new EdenClient({ links: [link] })

        await client.query('', { headers }).catch(() => {})

        expect(fetcher).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining(headersResults),
          }),
        )
      })

      test('merges array of link header resolvers with array of option header resolvers', async () => {
        const fetcher = vi.fn()

        const linkHeaderResults = {
          1: 'A',
          2: 'B',
          3: 'C',
        }

        const optionHeaderResults = {
          3: 'D',
          6: 'E',
          9: 'F',
        }

        const optionHeaders: EdenRequestHeaders = Object.entries(optionHeaderResults).map(
          (entry) => {
            return () => {
              return {
                [entry[0]]: entry[1],
              }
            }
          },
        )

        const linkHeaders: HTTPLinkHeaders = Object.entries(linkHeaderResults).map((entry) => {
          return () => {
            return {
              [entry[0]]: entry[1],
            }
          }
        })

        const link = httpLink({ domain: 'http://localhost:3000', fetcher, headers: linkHeaders })

        const client = new EdenClient({ links: [link] })

        await client.query('', { headers: optionHeaders }).catch(() => {})

        /**
         * IMPORTANT: the headers array must have higher precendence than the link headers!!!
         */
        const mergedHeaderResults = {
          ...linkHeaderResults,
          ...optionHeaderResults,
        }

        expect(fetcher).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining(mergedHeaderResults),
          }),
        )
      })
    })

    describe('fetch', () => {
      test('fetch options', async () => {
        const linkFetch: RequestInit = {
          credentials: 'include',
        }

        const optionsFetch: RequestInit = {
          keepalive: true,
        }

        const link = httpLink({ domain: 'http://localhost:3000', fetch: linkFetch })

        const client = new EdenClient({ links: [link] })

        await client.query('', { fetch: optionsFetch }).catch(() => {})

        expect(resolveEdenRequest).toHaveBeenLastCalledWith(
          expect.objectContaining({
            fetch: {
              ...linkFetch,
              ...optionsFetch,
            },
          }),
        )
      })
    })

    describe('domain', () => {
      test('defaults to domain in initialization', async () => {
        const domain = 'http://localhost:3000'

        const link = httpLink({ domain })

        const client = new EdenClient({ links: [link] })

        await client.query('').catch(() => {})

        expect(resolveEdenRequest).toHaveBeenLastCalledWith(
          expect.objectContaining({
            domain,
          }),
        )
      })

      test('domain in options overrides domain in link initialization', async () => {
        const linkDomain = 'http://localhost:3000'

        const optionsDomain = 'http://localhost:3001'

        const link = httpLink({ domain: linkDomain })

        const client = new EdenClient({ links: [link] })

        await client.query('', { domain: optionsDomain }).catch(() => {})

        expect(resolveEdenRequest).toHaveBeenLastCalledWith(
          expect.objectContaining({
            domain: optionsDomain,
          }),
        )
      })
    })

    describe('path', () => {
      test('defaults to query argument', async () => {
        const path = '/query'

        const link = httpLink()

        const client = new EdenClient({ links: [link] })

        await client.query(path, { domain: 'http://localhost:3000' }).catch(() => {})

        expect(resolveEdenRequest).toHaveBeenLastCalledWith(expect.objectContaining({ path }))
      })

      test('path in options overrides path in query argument', async () => {
        // This value is as the first argument to client.query
        const queryPath = '/query'

        // This value is provided directly in the options.
        const optionsPath = '/options'

        const link = httpLink()

        const client = new EdenClient({ links: [link] })

        await client
          .query(queryPath, { domain: 'http://localhost:3000', path: optionsPath })
          .catch(() => {})

        expect(resolveEdenRequest).toHaveBeenLastCalledWith(
          expect.objectContaining({
            path: optionsPath,
          }),
        )
      })
    })
  })

  test('throws error if a subscription is attempted', async () => {
    const link = httpLink()

    const client = new EdenClient({ links: [link] })

    expect(() => client.subscription('', {}, {})).toThrowError()
  })
})
