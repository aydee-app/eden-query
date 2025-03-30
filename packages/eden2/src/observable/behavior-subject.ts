import { Observable } from './observable'
import type { Observer } from './observer'

export interface BehaviorSubject<T> extends Observable<T, never> {
  observable: Observable<T, never>
  next: (value: T) => void
  get: () => T
}

export function behaviorSubject<TValue>(): BehaviorSubject<TValue | undefined>

export function behaviorSubject<TValue>(initialValue: TValue): BehaviorSubject<TValue>

/**
 * @internal
 *
 * An observable that maintains and provides a "current value" to subscribers
 *
 * @see https://www.learnrxjs.io/learn-rxjs/subjects/behaviorsubject
 */
export function behaviorSubject<TValue>(initialValue?: TValue): BehaviorSubject<TValue> {
  let value = initialValue as TValue

  const observerList: Observer<TValue, never>[] = []

  const addObserver = (observer: Observer<TValue, never>) => {
    if (value !== undefined) {
      observer.next(value)
    }

    observerList.push(observer)
  }

  const removeObserver = (observer: Observer<TValue, never>) => {
    observerList.splice(observerList.indexOf(observer), 1)
  }

  const observable = new Observable<TValue, never>((observer) => {
    addObserver(observer)

    return () => {
      removeObserver(observer)
    }
  }) as BehaviorSubject<TValue>

  observable.next = (nextValue: TValue) => {
    if (value === nextValue) return

    value = nextValue

    for (const observer of observerList) {
      observer.next(nextValue)
    }
  }

  observable.get = () => value

  return observable
}
