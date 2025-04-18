/**
 * Shared DTO, data-transformer objects, that Eden manages.
 *
 * The interfaces are loosely based on envelopes from tRPC.
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts
 */

import type { EdenRequestOptions } from './config'
import type { JSONRPC2 } from './json-rpc'

/**
 * Procedures that can be created on the server.
 * Elysia.js follows REST instead of RPC, so these are mostly irrelevant except for defining interfaces.
 *
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/procedure.ts#L4
 */
export const procedures = ['query', 'mutation', 'subscription'] as const

/**
 * Generalization of a request type. Mirrors both tRPC ProcedureType and TRPCType.
 *
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/procedure.ts#L8
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L23
 */
export type Procedure = (typeof procedures)[number]

/**
 * WebSocket client request to terminate the subscription.
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L94
 */
export interface EdenWebSocketSubscriptionStopRequest extends JSONRPC2.Request {
  method: 'subscription.stop'
}

/**
 * WebSocket client request to update connection params.
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L94
 */
export interface EdenWebSocketConnectionParamsRequest extends JSONRPC2.Request {
  method: 'connection-params'
  params: Dict<string> | null
}

/**
 * Equivalent to the input for a TRPCRequest.
 *
 * https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L54
 */
export interface EdenWebSocketFetchRequestParams {
  /**
   * The last event id that the client received
   */
  lastEventId?: string

  /**
   * EdenRequestParams for the request.
   */
  params?: EdenRequestOptions
}

/**
 * A request, i.e. query or mutation, sent over a WebSocket connection.
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L51
 *
 * Equivalent to TRPCRequest.
 * TRPCRequest seems a bit misleading because it does not seem to describe the shape of all requests.
 * It is a possible type of TRPCClientOutgoingMessage, which describes the JSON shape of WebSocket client messages.
 *
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L108
 */
export interface EdenWebSocketFetchRequest extends JSONRPC2.Request {
  /**
   * The request type. Not really important.
   */
  method: Procedure

  /**
   * The request information.
   *
   * This is used by the server to invoke endpoints directly, e.g. via `app.handle`.
   */
  params: EdenWebSocketFetchRequestParams
}

/**
 * Types of WebSocket requests that the client can send to the server.
 * https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L107
 *
 * Fully formed messages should always have an ID, e.g. {@link JSONRPC2.RequestId}.
 *
 * These are called "requests" based on the JSON-RPC client-server philosophy.
 * @see https://www.simple-is-better.org/rpc/#differences-between-1-0-and-2-0
 */
export type EdenWebSocketRequest =
  | EdenWebSocketSubscriptionStopRequest
  | EdenWebSocketConnectionParamsRequest
  | EdenWebSocketFetchRequest

/**
 * Server response asking the client to reconnect.
 * This server "response" may be emitted without a corresponding client request.
 *
 * Technically, this is a request where the server "requests" the client to reconnect.
 * As such, tRPC designates this as a JSON-RPC 2.0 request object sent by the server.
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/adapters/ws.ts#L566
 */
export interface EdenWebSocketReconnectResponse {
  type: 'reconnect'
  data?: never
  error?: never
}

/**
 * The WebSocket client will emit this result to subscribers once the WebSocket connection has been established.
 *
 * This is NOT emitted by the server, only by the client.
 */
export interface EdenWebSocketStartedClientResponse {
  type: 'started'
  data?: never
  error?: never
}

/**
 * The WebSocket client will emit this result to subscribers when the WebSocket connection has stopped.
 *
 * This is NOT emitted by the server, only by the client.
 */
export interface EdenWebSocketStoppedResponse {
  type: 'stopped'
  data?: never
  error?: never
}

/**
 * Same as tRPC ConnectionStateBase.
 *
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/client/src/links/internals/subscriptions.ts#L1
 */
export interface EdenWebSocketBaseState {
  type: 'state'
}

/**
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/client/src/links/internals/subscriptions.ts#L7
 */
export interface EdenWebSocketIdleState extends EdenWebSocketBaseState {
  state: 'idle'
  data?: never
  error?: never
}

/**
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/client/src/links/internals/subscriptions.ts#L11
 */
export interface EdenWebSocketConnectingState<T> extends EdenWebSocketBaseState {
  state: 'connecting'
  error?: T | null
  data?: never
}

/**
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/client/src/links/internals/subscriptions.ts#L16
 */
export interface EdenWebSocketPendingState extends EdenWebSocketBaseState {
  state: 'pending'
  error?: never
  data?: never
}

/**
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/client/src/links/internals/subscriptions.ts#L20
 */
export type EdenWebSocketState<T> =
  | EdenWebSocketIdleState
  | EdenWebSocketConnectingState<T>
  | EdenWebSocketPendingState

/**
 * Based on the official eden treaty response. Both the success and error responses will include the response object.
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/types.ts#L194-L218
 *
 * Be careful when sending this object from the server, e.g. via WebSockets or HTTP Response.
 * It will probably be converted to an empty object, {}, but may cause errors during serialization/deserialization.
 *
 * The status and headers properties have been omitted because they seem redundant.
 */
export interface EdenFetchBaseResult {
  response: Response
}

/**
 * Combination of the official Eden success result and TRPCResult.
 *
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/types.ts#L196-L200
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L64
 */
export interface EdenFetchSuccessResult<T> extends EdenFetchBaseResult {
  /**
   * The request ID of the message to keep track of in case of a reconnect.
   */
  id?: string

  /**
   * Constant type to discriminate between results.
   */
  type: 'data'

  /**
   * The data will be defined for a successful response.
   */
  data: T

  /**
   * There will be no error for a successful response.
   */
  error?: null
}

/**
 * Combination of the official Eden error result and TRPCResult.
 *
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/types.ts#L203-L217
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L64
 */
export interface EdenFetchErrorResult<T> extends EdenFetchBaseResult {
  /**
   * The request ID of the message to keep track of in case of a reconnect.
   */
  id?: string

  /**
   * This property is added for type discrimination, and it is omitted in the actual result.
   */
  type?: never

  /**
   * There will be no top-level data for an error response.
   * However, {@link T} should be a custom error class that may contain additional information.
   *
   * In the case of the official library, the error will contain "value" and "status", which
   * contain the the response data and response status respectively.
   *
   * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/types.ts#L204-L214
   */
  data?: null

  /**
   * The error for an error response. It should be a custom error class that contains
   * additional information about the error, such as the response data and status.
   */
  error: T
}

/**
 */
export type EdenErrorResult<T = any> = EdenFetchErrorResult<T>

/**
 */
export type EdenFetchResult<TData = any, TError = any> =
  | EdenFetchSuccessResult<TData>
  | EdenFetchErrorResult<TError>

/**
 * Primarily intended for usage by the WebSocket client.
 * A union of all possible results, i.e. unwrapped in a JSON-RPC-esque object.
 */
export type EdenSuccessResult<T> =
  | EdenFetchSuccessResult<T>
  | EdenWebSocketStartedClientResponse
  | EdenWebSocketStoppedResponse
  | EdenWebSocketReconnectResponse

/**
 * JSON-RPC envelope for an Eden success result.
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L73
 *
 * For convenience, both error and result are defined in the interface for discrimination capabilities.
 * Based on the JSON-RPC 2.0 specification, the presence of either is mutually exclusive.
 * @see https://www.jsonrpc.org/specification#response_object
 */
export interface EdenSuccessResponse<T> extends JSONRPC2.SuccessResponse {
  result: EdenSuccessResult<T>
  error?: never
}

/**
 * JSON-RPC envelope for an Eden error result.
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L76
 *
 * For convenience, both error and result are defined in the interface for discrimination capabilities.
 * Based on the JSON-RPC 2.0 specification, the presence of either is mutually exclusive.
 *
 * @see https://www.jsonrpc.org/specification#response_object
 */
export interface EdenErrorResponse<T = any> extends JSONRPC2.ErrorResponse {
  result?: never
  error: EdenErrorResult<T>
}

/**
 * Any valid result.
 */
export type EdenResult<TData = any, TError = any> =
  | EdenSuccessResult<TData>
  | EdenErrorResult<TError>
  | EdenWebSocketState<TError>

/**
 * Any response.
 *
 * @see https://github.com/trpc/trpc/blob/f159ab9c4fa2b428a8d1bd0d69232976032f7996/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L80
 */
export type EdenResponse<TData = unknown, TError = unknown> =
  | EdenSuccessResponse<TData>
  | EdenErrorResponse<TError>

/**
 * Any WebSocket response sent by the server and received by the client.
 *
 * A fully formed response message that is sent by the server should also contain a request ID.
 */
export type EdenWebSocketResponse<TData = unknown, TError = unknown> = EdenResponse<TData, TError>

/**
 * When making requests, e.g. queries and mutations, with a WebSocket client,
 * the server will receive request messages sent by the client via the connection.
 *
 * A request message is just a JSON that contains request information that would normally be used
 * by the client to resolve a request, i.e. via basic HTTP networking, fetch request.
 *
 * Instead, if the server receives such a message, it can call `app.handle` with the same
 * information and send the result back over the connection.
 *
 * Basically like {@link EdenWebSocketRequest} but with a defined ID.
 */
export type EdenWebSocketOutgoingMessage = {
  id: JSONRPC2.RequestId
} & EdenWebSocketRequest

/**
 * When making requests, e.g. queries and mutations, with a WebSocket client,
 * the client will receive response messages sent by the server via the connection.
 *
 * A response message is just a JSON that contains response information that would normally be returned
 * by the client upon resolving a request, i.e. via basic HTTP networking, fetch request.
 *
 * Instead, if the server receives such a message, it can call `app.handle` with the same
 * information and send the result back over the connection.
 *
 * Basically like {@link EdenWebSocketResponse} but with a defined ID.
 */
export type EdenWebSocketIncomingMessage<TData = unknown, TError = unknown> = {
  id: JSONRPC2.RequestId
} & EdenWebSocketResponse<TData, TError>
