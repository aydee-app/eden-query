import type { EdenRequestParams } from '../../core/request'
import type { JSONRPC2 } from '../../json-rpc'
import type { Procedure } from '../../trpc/procedure'
import type { Nullish } from '../../utils/types'

/**
 * Request ID that follows the JSON-RPC 2.0 specification.
 */
export type EdenRequestId = JSONRPC2.RequestId

/**
 * All eden requests and responses extend this interface.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L24-L27
 */
export interface EdenBaseEnvelope {
  /**
   * Unique ID of the request.
   */
  id?: EdenRequestId
}

/**
 * Operation result with data.
 */
export interface EdenDataResult<T> {
  id?: string

  /**
   */
  type?: 'data'

  /**
   */
  data: T
}

export interface EdenStartedResult {
  type: 'started'
  data?: never
}

export interface EdenStoppedResult {
  type: 'stopped'
  data?: never
}

export interface EdenProcedureRequest<T> {
  type: Procedure
  params: T

  /**
   * The last event id that the client received
   */
  lastEventId?: string
}

/**
 * Connection params when using `httpSubscriptionLink` or `createWSClient`
 */
export type EdenConnectionParams = Dict<string> | null

export interface EdenConnectionParamsRequest {
  type: 'connectionParams'
  data: EdenConnectionParams
}

export interface EdenReconnectRequest {
  type: 'reconnect'
  id: EdenRequestId
}

export interface EdenBaseConnectionState {
  type: 'state'
}

export interface EdenConnectionIdleState extends EdenBaseConnectionState {
  state: 'idle'
  error?: Nullish
}

export interface EdenConnectionConnectingState<T> extends EdenBaseConnectionState {
  state: 'connecting'
  error?: T | Nullish
}

export interface EdenConnectionPendingState extends EdenBaseConnectionState {
  state: 'pending'
  error?: Nullish
}

export type EdenConnectionState<T> =
  | EdenConnectionIdleState
  | EdenConnectionConnectingState<T>
  | EdenConnectionPendingState

/**
 * A raw result from an operation.
 */
export type OperationResult<TOutput, TError> =
  | EdenDataResult<TOutput>
  | EdenStartedResult
  | EdenStoppedResult
  | EdenConnectionState<TError>

/**
 * This interface can be extended if custom links mutate the context.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L18C1-L21C69
 */
export interface OperationContext extends Record<string, unknown> {}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L26
 */
export interface Operation<T extends EdenRequestParams = EdenRequestParams>
  extends OperationOptions<T> {
  id: number
  context: OperationContext
}

export interface OperationOptions<T extends EdenRequestParams = EdenRequestParams> {
  type: Procedure
  path: string
  context?: OperationContext
  signal?: AbortSignal | Nullish
  params: T
}
