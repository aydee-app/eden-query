import type { Observer } from './observer'

export type UnaryFunction<TSource = any, TReturn = any> = (source: TSource) => TReturn

export type MonoTypeOperatorFunction<TValue, TError> = OperatorFunction<
  TValue,
  TError,
  TValue,
  TError
>

export type OperatorFunction<
  TValueBefore = any,
  TErrorBefore = any,
  TValueAfter = any,
  TErrorAfter = any,
> = UnaryFunction<Subscribable<TValueBefore, TErrorBefore>, Subscribable<TValueAfter, TErrorAfter>>

export type Unsubscribable = {
  unsubscribe(): void
}

export type TeardownLogic = Unsubscribable | Function | void

export class Subscribable<TValue = any, TError = any> {
  constructor(public onSubscribe: (observer: Observer<TValue, TError>) => TeardownLogic) {}

  subscribe(observer?: Partial<Observer<TValue, TError>>): Unsubscribable {
    let teardownRef: TeardownLogic | null = null
    let isDone = false
    let unsubscribed = false
    let teardownImmediately = false

    const unsubscribe = () => {
      if (unsubscribed) return

      if (teardownRef === null) {
        teardownImmediately = true
        return
      }

      unsubscribed = true

      if (typeof teardownRef === 'function') {
        teardownRef()
      } else if (teardownRef) {
        teardownRef.unsubscribe()
      }
    }

    teardownRef = this.onSubscribe({
      next: (value) => {
        if (isDone) return
        observer?.next?.(value)
      },
      error: (err) => {
        if (isDone) return
        isDone = true
        observer?.error?.(err)
        unsubscribe()
      },
      complete: () => {
        if (isDone) return
        isDone = true
        observer?.complete?.()
        unsubscribe()
      },
    })

    if (teardownImmediately) {
      unsubscribe()
    }

    return {
      unsubscribe,
    }
  }
}

export class Observable<TValue = any, TError = any> extends Subscribable<TValue, TError> {
  constructor(onSubscribe: (observer: Observer<TValue, TError>) => TeardownLogic) {
    super(onSubscribe)
  }

  pipe(): Observable<TValue, TError>

  pipe<TValue1, TError1>(
    op1: OperatorFunction<TValue, TError, TValue1, TError1>,
  ): Observable<TValue1, TError1>

  pipe<TValue1, TError1, TValue2, TError2>(
    op1: OperatorFunction<TValue, TError, TValue1, TError1>,
    op2: OperatorFunction<TValue1, TError1, TValue2, TError2>,
  ): Observable<TValue2, TError2>

  pipe<TValue1, TError1, TValue2, TError2, TValue3, TError3>(
    op1: OperatorFunction<TValue, TError, TValue1, TError1>,
    op2: OperatorFunction<TValue1, TError1, TValue2, TError2>,
    op3: OperatorFunction<TValue2, TError2, TValue3, TError3>,
  ): Observable<TValue3, TError3>

  pipe<TValue1, TError1, TValue2, TError2, TValue3, TError3, TValue4, TError4>(
    op1: OperatorFunction<TValue, TError, TValue1, TError1>,
    op2: OperatorFunction<TValue1, TError1, TValue2, TError2>,
    op3: OperatorFunction<TValue2, TError2, TValue3, TError3>,
    op4: OperatorFunction<TValue3, TError3, TValue4, TError4>,
  ): Observable<TValue4, TError4>

  pipe<TValue1, TError1, TValue2, TError2, TValue3, TError3, TValue4, TError4, TValue5, TError5>(
    op1: OperatorFunction<TValue, TError, TValue1, TError1>,
    op2: OperatorFunction<TValue1, TError1, TValue2, TError2>,
    op3: OperatorFunction<TValue2, TError2, TValue3, TError3>,
    op4: OperatorFunction<TValue3, TError3, TValue4, TError4>,
    op5: OperatorFunction<TValue4, TError4, TValue5, TError5>,
  ): Observable<TValue5, TError5>

  pipe(...operations: OperatorFunction[]): Observable {
    return operations.reduce(pipeReducer, this)
  }
}

export function isObservable(x: unknown): x is Observable<unknown, unknown> {
  return typeof x === 'object' && x !== null && 'subscribe' in x
}

export function pipeReducer(previousValue: any, next: UnaryFunction) {
  return next(previousValue)
}

/**
 * Alias for {@link observableToPromise}.
 */
export const promisifyObservable = observableToPromise

/**
 * @internal
 *
 * @see https://github.com/trpc/trpc/blob/045fe47ec3c0fa39141e9048c38902fae41fc5ba/packages/server/src/observable/observable.ts#L90C1-L123C2
 */
export function observableToPromise<T>(observable: Observable<T, unknown>) {
  const abortController = new AbortController()

  const promise = new Promise<T>((resolve, reject) => {
    let isDone = false

    function onDone() {
      if (isDone) return

      isDone = true
      unsubscribable.unsubscribe()
    }

    abortController.signal.addEventListener('abort', () => {
      reject(abortController.signal.reason)
    })

    const unsubscribable = observable.subscribe({
      next(data) {
        isDone = true
        resolve(data)
        onDone()
      },
      error(data) {
        reject(data)
      },
      complete() {
        abortController.abort()
        onDone()
      },
    })
  })

  return promise
}
