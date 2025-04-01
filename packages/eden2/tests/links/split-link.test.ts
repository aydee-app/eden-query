import { describe, expect, test, vi } from 'vitest'

import { createChain } from '../../src/links/internal/create-chain'
import type { Operation } from '../../src/links/internal/operation'
import { splitLink } from '../../src/links/split-link'
import { Observable, promisifyObservable } from '../../src/observable'

describe('splitLink', () => {
  test('calls true link', async () => {
    const spy = vi.fn()

    const op: Operation = {
      id: 0,
      type: 'query',
      path: '',
      params: {},
      context: {},
    }

    const trueResult = { result: { data: true } }

    const falseResult = { result: { data: false } }

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

    const trueResult = { result: { data: true } }

    const falseResult = { result: { data: false } }

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
