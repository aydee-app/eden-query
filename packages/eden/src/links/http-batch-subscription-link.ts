import type { InternalElysia } from '../core/types'
import {
  httpBatchLink,
  type HTTPBatchLinkOptions,
  type HTTPBatchLinkResult,
} from './http-batch-link'

export function httpBatchSubscriptionLink<TElysia extends InternalElysia, const TConfig>(
  options: HTTPBatchLinkOptions<TElysia, TConfig> = {} as any,
): HTTPBatchLinkResult<TElysia, TConfig> {
  return httpBatchLink({ ...options, stream: true })
}
