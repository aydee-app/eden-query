import type { InternalElysia } from '../elysia'
import { Observable } from '../observable'
import { toArray } from '../utils/to-array'
import { createChain } from './internal/create-chain'
import type { EdenLink } from './internal/eden-link'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

export interface SplitLinkOptions<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
> {
  condition: (op: Operation<TElysia, TKey>) => boolean
  /**
   * The link to execute next if the test function returns `true`.
   */
  true: EdenLink<TElysia, TKey> | EdenLink<TElysia, TKey>[]
  /**
   * The link to execute next if the test function returns `false`.
   */
  false: EdenLink<TElysia, TKey> | EdenLink<TElysia, TKey>[]
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/splitLink.ts
 */
export function splitLink<TElysia extends InternalElysia = InternalElysia, TKey = undefined>(
  options: SplitLinkOptions<TElysia, TKey>,
): EdenLink<TElysia, TKey> {
  const link = ((runtime) => {
    const yes = toArray(options.true).map((link) => link(runtime))
    const no = toArray(options.false).map((link) => link(runtime))

    const operationLink = ((props) => {
      const links = options.condition(props.op) ? yes : no

      return new Observable((observer) => {
        return createChain({ op: props.op, links }).subscribe(observer)
      })
    }) satisfies OperationLink<TElysia, TKey>

    return operationLink
  }) satisfies EdenLink<TElysia, TKey>

  return link
}
