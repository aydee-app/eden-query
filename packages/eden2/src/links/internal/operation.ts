import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import type { EdenSuccessResponse } from '../../core/response'
import type { Nullish } from '../../utils/types'
import type { Observer } from './observable'
import type { EdenConnectionState } from './subscription'

export interface EdenResult<TData = unknown> {
  data: TData

  type?: 'data'

  /**
   * The id of the message to keep track of in case of a reconnect
   */
  id?: string
}

export type EdenResultMessage =
  | { type: 'started'; data?: never }
  | { type: 'stopped'; data?: never }
  | EdenResult

/**
 * @internal
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L62
 */
export interface OperationResultEnvelope<TOutput, TError> {
  context?: OperationContext
  result: EdenSuccessResponse<TOutput> | EdenConnectionState<TError> | EdenResultMessage
}

/**
 * @internal
 */
export type OperationResultObserver<TElysia extends AnyElysia, TOutput> = Observer<
  OperationResultEnvelope<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>

/**
 * This interface can be extended if custom links mutate the context.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L18C1-L21C69
 */
export interface OperationContext extends Record<string, unknown> {}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L26
 */
export type Operation<T extends EdenRequestParams = any> = {
  id: number
  type: 'mutation' | 'query' | 'subscription'
  path: string
  context: OperationContext
  signal?: AbortSignal | Nullish

  params: T

  // tRPC passes everything via JSON input, but Eden and Elysia.js can use REST inputs
  // like query, params, body, etc.
  /* input: TInput */
}
