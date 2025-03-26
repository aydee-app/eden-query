/* eslint-disable @typescript-eslint/no-namespace */

/**
 * JSON-RPC 2.0 Specification
 */
export namespace JSONRPC2 {
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

  // export interface ErrorResponse<TError extends TRPCErrorShape = TRPCErrorShape>
  //   extends BaseEnvelope {
  //   error: TError;
  // }
}
