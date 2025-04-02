/* eslint-disable @typescript-eslint/no-namespace */

/**
 * JSON-RPC 2.0 Specification
 *
 * One thing to note is that all interfaces have docstrings attached to all their properties.
 * If the original interface is extended with property overrides, those new properties
 * will actually inherit the original docstrings unless those a new one is explicitly written.
 */
export namespace JSONRPC2 {
  export type RequestId = number | string | null

  /**
   * All JSON-RPC 2.0 requests and responses extend this shape.
   *
   * Both properties are technically required, but I guess we're going to be more relaxed with this...
   *
   * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L24
   * @see https://www.jsonrpc.org/specification#request_object
   * @see https://www.jsonrpc.org/specification#response_object
   */
  export interface BaseEnvelope {
    /**
     * Request
     * An identifier established by the Client that MUST contain a String, Number, or NULL value if included.
     * If it is not included it is assumed to be a notification.
     * The value SHOULD normally not be Null [1] and Numbers SHOULD NOT contain fractional parts [2]
     *
     * Response
     * This member is REQUIRED.
     * It MUST be the same as the value of the id member in the Request Object.
     * If there was an error in detecting the id in the Request object (e.g. Parse error/Invalid Request), it MUST be Null.
     */
    id?: RequestId

    /**
     * A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
     */
    jsonrpc?: '2.0'
  }

  /**
   * @see https://www.jsonrpc.org/specification#request_object
   */
  export interface Request extends BaseEnvelope {
    /**
     * An identifier established by the Client that MUST contain a String, Number, or NULL value if included.
     * If it is not included it is assumed to be a notification.
     * The value SHOULD normally not be Null [1] and Numbers SHOULD NOT contain fractional parts [2]
     */
    id?: RequestId

    /**
     * A String containing the name of the method to be invoked.
     * Method names that begin with the word rpc followed by a period character (U+002E or ASCII 46)
     * are reserved for rpc-internal methods and extensions and MUST NOT be used for anything else.
     */
    method: string

    /**
     * A Structured value that holds the parameter values to be used during the invocation of the method.
     * This member MAY be omitted.
     */
    params?: any
  }

  export interface SuccessResponse extends BaseEnvelope {
    /**
     * This member is REQUIRED on success.
     * This member MUST NOT exist if there was an error invoking the method.
     * The value of this member is determined by the method invoked on the Server.
     */
    result: any

    /**
     * This member is REQUIRED on error.
     * This member MUST NOT exist if there was no error triggered during invocation.
     * The value for this member MUST be an Object as defined in section 5.1.
     */
    error?: never
  }

  export interface ErrorResponse extends BaseEnvelope {
    /**
     * This member is REQUIRED on success.
     * This member MUST NOT exist if there was an error invoking the method.
     * The value of this member is determined by the method invoked on the Server.
     */
    result?: never

    /**
     * This member is REQUIRED on error.
     * This member MUST NOT exist if there was no error triggered during invocation.
     * The value for this member MUST be an Object as defined in section 5.1.
     */
    error: any
  }
}
