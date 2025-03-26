import type { AnyElysia } from 'elysia'

import type { EdenClientError, EdenFetchError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import type { JSONRPC2 } from '../../trpc/envelope'
import type { Nullish } from '../../utils/types'
import type { Observer } from './observable'
import type { EdenConnectionState } from './subscription'

export const procedureTypes = ['query', 'mutation', 'subscription'] as const
/**
 * @public
 */
export type ProcedureType = (typeof procedureTypes)[number]

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

export interface EdenErrorResponse<TError extends EdenFetchError = EdenFetchError>
  extends JSONRPC2.ErrorResponse<TError> {}

/**
 */
export interface EdenSuccessResultResponse<TData>
  extends JSONRPC2.ResultResponse<EdenResult<TData>> {}

export type EdenResponseMessage<TData = unknown, TError extends EdenFetchError = EdenFetchError> = {
  id: JSONRPC2.RequestId
} & (EdenErrorResponse<TError> | EdenResultMessage<TData>)

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

/**
 * The client's outgoing request types
 */
export type EdenClientOutgoingRequest = EdenSubscriptionStopNotification

/**
 * The client asked the server to unsubscribe
 */
export interface EdenSubscriptionStopNotification
  extends JSONRPC2.BaseRequest<'subscription.stop'> {
  id: null
}

export interface EdenRequest
  extends JSONRPC2.Request<
    ProcedureType,
    {
      path: string
      input: unknown
      /**
       * The last event id that the client received
       */
      lastEventId?: string
    }
  > {}

export type EdenRequestMessage = EdenRequest & {
  id: JSONRPC2.RequestId
}

/**
 * The client's sent messages shape
 */
export type EdenClientOutgoingMessage =
  | EdenRequestMessage
  | (JSONRPC2.BaseRequest<'subscription.stop'> & { id: JSONRPC2.RequestId })

/**
 * The client sends connection params - always sent as the first message
 */
export interface EdenConnectionParamsMessage extends JSONRPC2.BaseRequest<'connectionParams'> {
  data: EdenConnectionParams
}

/**
 * Connection params when using `httpSubscriptionLink` or `createWSClient`
 */
export type EdenConnectionParams = Dict<string> | null

/**
 * The server asked the client to reconnect - useful when restarting/redeploying service
 */
export interface EdenReconnectNotification extends JSONRPC2.BaseRequest<'reconnect'> {
  id: JSONRPC2.RequestId
}

/**
 * The client's incoming request types
 */
export type EdenClientIncomingRequest = EdenReconnectNotification

/**
 * The client's received messages shape
 */
export type EdenClientIncomingMessage<
  TResult = unknown,
  TError extends EdenFetchError = EdenFetchError,
> = EdenClientIncomingRequest | EdenResponseMessage<TResult, TError>
