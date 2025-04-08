import { EventEmitter } from 'node:events'

import { expect, expectTypeOf, test, vi } from 'vitest'

import {
  distinctUntilChanged,
  distinctUntilDeepChanged,
  map,
  Observable,
  share,
} from '../../src/observable'

interface SubscriptionEvents<TOutput> {
  data: (data: TOutput) => void
}

declare interface CustomEventEmitter<TOutput> {
  on<U extends keyof SubscriptionEvents<TOutput>>(
    event: U,
    listener: SubscriptionEvents<TOutput>[U],
  ): this

  once<U extends keyof SubscriptionEvents<TOutput>>(
    event: U,
    listener: SubscriptionEvents<TOutput>[U],
  ): this

  emit<U extends keyof SubscriptionEvents<TOutput>>(
    event: U,
    ...args: Parameters<SubscriptionEvents<TOutput>[U]>
  ): boolean
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class CustomEventEmitter<TOutput> extends EventEmitter implements CustomEventEmitter<TOutput> {}
test('map', () => {
  type EventShape = { num: number }
  const ee = new CustomEventEmitter<EventShape>()
  const eventObservable = new Observable<EventShape, unknown>((observer) => {
    const callback = (data: EventShape) => {
      observer.next(data)
    }
    ee.on('data', callback)

    return () => {
      ee.off('data', callback)
    }
  })
  const pipeCalls = vi.fn()
  const piped = eventObservable.pipe(
    map((...args) => {
      pipeCalls(...args)
      const [value] = args
      return value.num
    }),
  )

  const next = vi.fn()
  const subscription = piped.subscribe({
    next(value) {
      expectTypeOf<number>(value)
      next(value)
    },
  })
  expect(next).not.toHaveBeenCalled()
  ee.emit('data', { num: 1 })
  ee.emit('data', { num: 2 })
  expect(next).toHaveBeenCalledTimes(2)
  expect(next.mock.calls).toMatchInlineSnapshot(`
    [
      [
        1,
      ],
      [
        2,
      ],
    ]
  `)
  expect(pipeCalls.mock.calls).toMatchInlineSnapshot(`
    [
      [
        {
          "num": 1,
        },
        0,
      ],
      [
        {
          "num": 2,
        },
        1,
      ],
    ]
  `)

  expect(ee.listeners('data')).toHaveLength(1)
  subscription.unsubscribe()
  expect(ee.listeners('data')).toHaveLength(0)
})

test('share', () => {
  const obs = share()(
    new Observable<number, Error>((observer) => {
      observer.next(1)
    }),
  )

  {
    const next = vi.fn()
    const error = vi.fn()
    const complete = vi.fn()

    // eslint-disable-next-line no-var
    var subscription1 = obs.subscribe({
      next,
      error,
      complete,
    })
    expect(next.mock.calls).toHaveLength(1)
    expect(complete.mock.calls).toHaveLength(0)
    expect(error.mock.calls).toHaveLength(0)
    expect(next.mock.calls[0]![0]).toBe(1)
  }

  {
    // subscribe again - it's shared so should not propagate any results
    const next = vi.fn()
    const error = vi.fn()
    const complete = vi.fn()
    // eslint-disable-next-line no-var
    var subscription2 = obs.subscribe({
      next,
      error,
      complete,
    })
    expect(next.mock.calls).toHaveLength(0)
    expect(complete.mock.calls).toHaveLength(0)
    expect(error.mock.calls).toHaveLength(0)
  }

  subscription1.unsubscribe()
  subscription2.unsubscribe()
  // now it should be reset so we can do a new subscription
  {
    const next = vi.fn()
    const error = vi.fn()
    const complete = vi.fn()
    const subscription3 = obs.subscribe({
      next,
      error,
      complete,
    })
    expect(next.mock.calls).toHaveLength(1)
    expect(complete.mock.calls).toHaveLength(0)
    expect(error.mock.calls).toHaveLength(0)
    expect(next.mock.calls[0]![0]).toBe(1)
    subscription3.unsubscribe()
  }
})

test('distinctUntilChanged', () => {
  const source = new Observable<number, never>((observer) => {
    observer.next(1)
    observer.next(1)
    observer.next(2)
    observer.next(2)
    observer.next(3)
    observer.next(1)
  })

  const results: number[] = []
  const distinctObs = source.pipe(distinctUntilChanged())

  distinctObs.subscribe({
    next: (value) => results.push(value),
  })
  expect(results).toEqual([1, 2, 3, 1])
})

test('distinctUntilDeepChanged', () => {
  const source = new Observable<{ a: number; b: { c: string } }, never>((observer) => {
    // Emitting the first value with a = 1 and b.c = 'x'
    observer.next({ a: 1, b: { c: 'x' } })
    // Emitting the same value again to test distinctUntilDeepChanged
    observer.next({ a: 1, b: { c: 'x' } })
    // Emitting a new value with a = 2 and b.c = 'x'
    observer.next({ a: 2, b: { c: 'x' } })
    // Emitting a value with a = 2 and b.c = 'y' to test deep change detection
    observer.next({ a: 2, b: { c: 'y' } })
    // Emitting the same value again to test distinctUntilDeepChanged
    observer.next({ a: 2, b: { c: 'y' } })
    // Emitting the same value with properties in a different order to test deep equality
    observer.next({ b: { c: 'y' }, a: 2 })
    // Emitting the first value again to test if it's considered distinct after a deep change
    observer.next({ a: 1, b: { c: 'x' } })
  })

  const results: { a: number; b: { c: string } }[] = []
  const distinctObs = source.pipe(distinctUntilDeepChanged())

  distinctObs.subscribe({
    next: (value) => results.push(value),
  })

  expect(results).toEqual([
    { a: 1, b: { c: 'x' } },
    { a: 2, b: { c: 'x' } },
    { a: 2, b: { c: 'y' } },
    { a: 1, b: { c: 'x' } },
  ])
})
