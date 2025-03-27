/**
 * Placeholder interface for tRPC type.
 */
interface TRPCErrorShape {}

/**
 * JSON-RPC 2.0 Specification
 *
 * @see https://github.com/trpc/trpc/blob/045fe47ec3c0fa39141e9048c38902fae41fc5ba/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L18-L47
 *
 * Most of these types are primarily leveraged by the WebSocket integration
 * and otherwise ignored.
 *
 * Eden will only really use the {@link JSONRPC2.BaseEnvelope} along with a `type`
 * property to provide type-narrowing functionality.
 */
export namespace JSONRPC2 {
  export type RequestId = number | string | null | undefined | void

  /**
   * All requests and responses extend this interface.
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
