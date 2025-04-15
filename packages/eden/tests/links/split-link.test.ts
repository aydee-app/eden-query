import { describe, expect, test, vi } from 'vitest'

import type { EdenResponse } from '../../src/core/dto'
import { createChain } from '../../src/links/shared'
import { splitLink } from '../../src/links/split-link'
import type { Operation } from '../../src/links/types'
import { Observable, promisifyObservable } from '../../src/observable'

describe('splitLink', () => {
  const response = new Response()

  test('calls true link', async () => {
    const spy = vi.fn()

    const op: Operation = {
      id: 0,
      type: 'query',
      path: '',
      params: {},
      context: {},
    }

    const trueResult: EdenResponse = { result: { type: 'data', data: true, response } }

    const falseResult: EdenResponse = { result: { type: 'data', data: false, response } }

    const chain = createChain({
      op,
      links: [
        ({ op, next }) => {
          const observable = next(op)

          observable.subscribe({ next: spy })

          return observable
        },
        splitLink({
          condition() {
            return true
          },
          true: () => () => {
            return new Observable((observer) => {
              observer.next(trueResult)
              observer.complete()
            })
          },
          false: () => () => {
            return new Observable((observer) => {
              observer.next(falseResult)
              observer.complete()
            })
          },
        })({}),
      ],
    })

    await promisifyObservable(chain)

    expect(spy).toHaveBeenCalledExactlyOnceWith(trueResult)
  })

  test('calls false link', async () => {
    const spy = vi.fn()

    const op: Operation = {
      id: 0,
      type: 'query',
      path: '',
      params: {},
      context: {},
    }

    const trueResult: EdenResponse = { result: { type: 'data', data: true, response } }

    const falseResult: EdenResponse = { result: { type: 'data', data: false, response } }

    const chain = createChain({
      op,
      links: [
        ({ op, next }) => {
          const observable = next(op)

          observable.subscribe({ next: spy })

          return observable
        },
        splitLink({
          condition() {
            return false
          },
          true: () => () => {
            return new Observable((observer) => {
              observer.next(trueResult)
              observer.complete()
            })
          },
          false: () => () => {
            return new Observable((observer) => {
              observer.next(falseResult)
              observer.complete()
            })
          },
        })({}),
      ],
    })

    await promisifyObservable(chain)

    expect(spy).toHaveBeenCalledExactlyOnceWith(falseResult)
  })
})
