import type { ELYSIA_ERROR_CODE } from './errors'

/**
 * Error response
 *
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L9
 */
export interface TRPCErrorShape<TData extends object = object> {
  code: ELYSIA_ERROR_CODE
  message: string
  data: TData
}

/**
 * JSON-RPC 2.0 Specification
 *
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L18
 *
 * Elysia.js and Eden use REST by default, not JSON RPC.
 */
export declare namespace JSONRPC2 {
  export type RequestId = number | string | null

  /**
   * All requests/responses extends this shape
   */
  export interface BaseEnvelope {
    id?: RequestId
    jsonrpc?: '2.0'
  }

  export interface BaseRequest<TMethod extends string = string> extends BaseEnvelope {
    method: TMethod
  }

  export interface Request<TMethod extends string = string, TParams = unknown>
    extends BaseRequest<TMethod> {
    params: TParams
  }

  export interface ResultResponse<TResult = unknown> extends BaseEnvelope {
    result: TResult
  }

  export interface ErrorResponse<TError extends TRPCErrorShape = TRPCErrorShape>
    extends BaseEnvelope {
    error: TError
  }
}

export interface EdenResultMessage<TData>
  extends JSONRPC2.ResultResponse<
    { type: 'started'; data?: never } | { type: 'stopped'; data?: never } | EdenResult<TData>
  > {}

export interface EdenResult<TData = unknown> {
  data: TData

  type?: 'data'

  /**
   * The id of the message to keep track of in case of a reconnect
   */
  id?: string
}

export interface EdenSuccessResponse<TData> extends JSONRPC2.ResultResponse<EdenResult<TData>> {}
