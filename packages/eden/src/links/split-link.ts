import type { InternalElysia } from '../core/types'
import { Observable } from '../observable'
import { toArray } from '../utils/array'
import { createChain } from './shared'
import type { EdenLink, Operation, OperationLink } from './types'

export interface SplitLinkOptions<T extends InternalElysia = InternalElysia> {
  condition: (op: Operation) => boolean
  /**
   * The link to execute next if the test function returns `true`.
   */
  true: EdenLink<T> | EdenLink<T>[]
  /**
   * The link to execute next if the test function returns `false`.
   */
  false: EdenLink<T> | EdenLink<T>[]
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/splitLink.ts
 */
export function splitLink<T extends InternalElysia = InternalElysia>(options: SplitLinkOptions<T>) {
  const link = ((runtime) => {
    const yes = toArray(options.true).map((link) => link(runtime))
    const no = toArray(options.false).map((link) => link(runtime))

    const operationLink = ((props) => {
      const links = options.condition(props.op) ? yes : no

      return new Observable((observer) => {
        return createChain({ op: props.op, links }).subscribe(observer)
      })
    }) satisfies OperationLink<T>

    return operationLink
  }) satisfies EdenLink<T>

  return link
}
