import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import type { JSONRPC2 } from '../../trpc/envelope'
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

export interface EdenResultMessage<T>
  extends JSONRPC2.ResultResponse<
    { type: 'started'; data?: never } | { type: 'stopped'; data?: never } | EdenResult<T>
  > {}

export interface EdenResult<TData = unknown> {
  data: TData
  type?: 'data'
  /**
   * The id of the message to keep track of in case of a reconnect
   */
  id?: string
}

/**
 */
export interface EdenSuccessResultResponse<TData>
  extends JSONRPC2.ResultResponse<EdenResult<TData>> {}

/**
 * @internal
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L62
 */
export interface OperationResultEnvelope<TOutput, TError> {
  context?: OperationContext
  result:
    | EdenConnectionState<TError>
    | EdenResultMessage<TOutput>['result']
    | EdenSuccessResultResponse<TOutput>['result']
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
