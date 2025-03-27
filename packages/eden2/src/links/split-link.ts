import type { AnyElysia } from 'elysia'

import { toArray } from '../utils/to-array'
import { createChain } from './internal/create-chain'
import type { EdenLink } from './internal/eden-link'
import { Observable } from './internal/observable'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

export interface SplitLinkOptions<T extends AnyElysia = AnyElysia> {
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
export function splitLink<T extends AnyElysia = AnyElysia>(
  options: SplitLinkOptions<T>,
): EdenLink<T> {
  const link: EdenLink<T> = (runtime) => {
    const yes = toArray(options.true).map((link) => link(runtime))
    const no = toArray(options.false).map((link) => link(runtime))

    const operationLink: OperationLink<T> = (props) => {
      const links = options.condition(props.op) ? yes : no

      return new Observable((observer) => {
        return createChain({ op: props.op, links }).subscribe(observer)
      })
    }

    return operationLink
  }
  return link
}
