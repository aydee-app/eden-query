import type { InternalElysia } from '../core/types'
import {
  httpBatchLink,
  type HTTPBatchLinkOptions,
  type HTTPBatchLinkResult,
} from './http-batch-link'

/**
 * @see https://trpc.io/docs/client/links/httpLink
 *
 * Tried to extrapolate return type but was not able to get correct inference
 * when inside of object errors. e.g. If {@link TConfig} itself contained an array,
 * then introspection would fail...
 */
export function httpBatchSubscriptionLink<
  TElysia extends InternalElysia,
  const TConfig extends HTTPBatchLinkOptions<TElysia, TConfig['types']>,
>(options: TConfig = {} as any): HTTPBatchLinkResult<TElysia, TConfig> {
  return httpBatchLink({ ...options, stream: true } as any) as any
}
