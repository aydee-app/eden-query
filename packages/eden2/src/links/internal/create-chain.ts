import type { EdenRequestParams } from '../../core/request'
import type { InternalElysia } from '../../elysia'
import { Observable } from '../../observable'
import type { Operation } from './operation'
import type { OperationLink, OperationLinkResultObservable } from './operation-link'

export type ChainOptions<
  TElysia extends InternalElysia,
  TInput extends EdenRequestParams = any,
  TOutput = unknown,
> = {
  links: OperationLink<TElysia, TInput, TOutput>[]
  op: Operation<TInput>
}

export function createChain<
  TElysia extends InternalElysia,
  TInput extends EdenRequestParams = any,
  TOutput = unknown,
>(
  options: ChainOptions<TElysia, TInput, TOutput>,
): OperationLinkResultObservable<TElysia, TOutput> {
  const observable = new Observable((observer) => {
    const execute = (index = 0, op = options.op) => {
      const next = options.links[index]

      if (next == null) {
        throw new Error('No more links to execute - did you forget to add an ending link?')
      }

      const subscription = next({
        op,
        next: (nextOp) => {
          const nextObserver = execute(index + 1, nextOp)
          return nextObserver
        },
      })

      return subscription
    }

    const rootObservable = execute()

    const $rootObservable = rootObservable.subscribe(observer)

    return $rootObservable
  })

  return observable
}
