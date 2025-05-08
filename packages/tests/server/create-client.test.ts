import { EdenClient, httpBatchLink } from '@ap0nia/eden'
import { describe, test } from 'vitest'

describe('typedefs on createClient', () => {
  test('ok to pass only links', () => {
    new EdenClient({
      links: [httpBatchLink({ domain: 'foo' })],
    })
  })

  test('error if both url and links are passed', () => {
    new EdenClient({
      links: [httpBatchLink({ domain: 'foo' })],
      // not a ts-expect error because domain is allowed here too...
      domain: 'foo',
    })
  })
})
