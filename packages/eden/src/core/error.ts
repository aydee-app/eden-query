import type { EDEN_ERROR_CODE, EDEN_ERROR_CODE_NUMBER } from './error-codes'
import type { EdenRootConfig, InternalElysia } from './types'

/**
 */
export interface EdenErrorData {
  /**
   * String representing the error code.
   */
  code?: EDEN_ERROR_CODE

  /**
   * HTTP status code of the response.
   */
  status?: number

  /**
   * Path to the procedure that threw the error.
   */
  path?: string

  /**
   * Stack trace of the error (only in development).
   */
  stack?: string
}

/**
 */
export interface EdenClientErrorOptions<T extends EdenErrorData = EdenErrorData>
  extends EdenRootConfig {
  /**
   * Actual error object. Only defined if accessed at same environment of origin.
   * For example, errors thrown by server will exist in `clause` on the server, but will
   * probably be lost returned in the response.
   */
  cause?: unknown

  /**
   * Numeric error code as specified by JSON-RPC. Will be in the range -32768 to -32000.
   *
   * @see https://www.jsonrpc.org/specification#error_object
   */
  code?: EDEN_ERROR_CODE_NUMBER

  /**
   */
  message?: string

  /**
   */
  data?: T

  /**
   */
  meta?: Record<string, unknown>
}

/**
 * Combination of the official EdenFetchError, TRPCErrorShape, TRPCClientError.
 *
 * - EdenFetchError is an object with a strongly typed, numeric HTTP status and a value.
 *   It is used to map error HTTP status codes to the corresponding error value.
 *
 * - TRPCErrorShape describes JSON error information returned by the server when it encounters an error.
 *   It is based on the JSON-RPC specification.
 *   @see https://github.com/Afya-Global/admin-redesign/issues
 *   Elysia.js does not have any error formatter by default, so errors may not conform to this RPC specification.
 *
 * - TRPCClientError is an error that wraps around a result. A result is just a wrapper around a raw response,
 *   its data, and other information. When encountering an error when resolving requests,
 *   tRPC will throw this error containing the result. See notes below.
 *
 * tRPC server handles errors as TRPCErrorShape objects, and tRPC client encapsulates responses
 * containing errors into a TRPCClientError before throwing them.
 *
 * Eden will always treats errors as values in order to provide helpful type discrimination.
 * Therefore, the error will will not have properties like `result` with the response information.
 * The error will be part of the result itself, and thus contain the error data directly from the server.
 */
export class EdenClientError<
  _TElysa extends InternalElysia = InternalElysia,
  TData extends EdenErrorData = EdenErrorData,
> extends Error {
  /**
   * Additional information captured by TRPCClientError.
   *
   * Additional meta data about the error.
   * In the case of HTTP-errors, we'll have `response` and potentially `responseJSON` here.
   *
   * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L66
   */
  public meta?: Record<string, unknown>

  /**
   * The client or server numeric error code. Based on TRPCErrorShape.
   *
   * @see https://github.com/trpc/trpc/blob/8cef54eaf95d8abc8484fe1d454b6620eeb57f2f/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L10
   */
  public code?: EDEN_ERROR_CODE_NUMBER

  /**
   * Additional data about the error. Mainly intended for error data from the server.
   * Based on TRPCErrorShape.
   *
   * @see https://github.com/trpc/trpc/blob/8cef54eaf95d8abc8484fe1d454b6620eeb57f2f/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts#L12
   */
  public data?: TData

  /**
   * HTTP status code if the error originated from a response.
   * This will not exist if the error was thrown from the client prior to a request.
   *
   * Based on EdenFetchError from the official Eden library.
   */
  public status?: number

  /**
   * Raw value associated with the error.
   * Eden will store the original value sent by the server in the error response.
   *
   * Based on EdenFetchError from the official Eden library.
   */
  value?: unknown

  override name = 'EdenClientError'

  public override readonly cause?: Error

  public readonly options?: EdenClientErrorOptions<TData>

  constructor(message?: string, options?: EdenClientErrorOptions<TData>) {
    super(message, options)

    this.options = options
    this.meta = options?.meta
    this.data = options?.data
    this.code = options?.code
    this.cause = options?.cause as any
  }

  public static from<TElysa extends InternalElysia = InternalElysia>(
    cause: unknown,
    options?: EdenClientErrorOptions,
  ): EdenClientError<TElysa> {
    if (this.isEdenError(cause)) {
      cause.meta = { ...cause.meta, ...options?.meta }
      return cause
    }

    const message = getMessageFromUnknownError(cause) || 'Unknown error'
    return new EdenClientError(message, { ...options, cause })
  }

  /**
   * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L22
   */
  public static isEdenError(cause: unknown): cause is EdenClientError {
    if (cause instanceof EdenClientError) return true

    /**
     * @deprecated
     * Delete in next major
     */
    if (cause instanceof Error && cause.name === EdenClientError.name) return true

    return false
  }
}

/**
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/errors.ts#L1
 */
export class EdenFetchError<
  TStatus extends number = number,
  TValue = unknown,
> extends EdenClientError {
  public override status: TStatus

  public override value: TValue

  constructor(status: TStatus, value: TValue, options?: EdenClientErrorOptions) {
    const message = options?.message || value + ''

    super(message, { ...options })

    this.status = status
    this.value = value
  }
}

export interface EdenServerErrorOptions extends EdenRootConfig {
  message?: string
  code: EDEN_ERROR_CODE
  cause?: unknown
}

/**
 * Matches the error object specified by JSON-RPC.
 *
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class EdenServerError extends Error {
  public override readonly cause?: Error

  public readonly code: EDEN_ERROR_CODE

  public override name = 'EdenServerError'

  constructor(options: EdenServerErrorOptions) {
    const cause = getCauseFromUnknown(options.cause)

    const message = options.message ?? cause?.message ?? options.code

    super(message, { cause })

    this.code = options.code

    if (!this.cause) {
      // < ES2022 / < Node 16.9.0 compatability
      this.cause = cause
    }
  }
}

class UnknownCauseError extends Error {
  [key: string]: unknown
}

/**
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L42
 */
function getMessageFromUnknownError(err: unknown) {
  if (typeof err === 'string') {
    return err
  }

  if (err && typeof err === 'object' && 'message' in err && typeof err['message'] === 'string') {
    return err['message']
  }

  return
}

export function getEdenErrorFromUnknown(cause: unknown): EdenServerError {
  if (cause instanceof EdenServerError) {
    return cause
  }

  if (cause instanceof Error && cause.name === 'TRPCError') {
    // https://github.com/trpc/trpc/pull/4848
    return cause as EdenServerError
  }

  const error = new EdenServerError({
    code: 'INTERNAL_SERVER_ERROR',
    cause,
  })

  // Inherit stack from error
  if (cause instanceof Error && cause.stack) {
    error.stack = cause.stack
  }

  return error
}

export function getCauseFromUnknown(cause: unknown): Error | undefined {
  if (cause instanceof Error) {
    return cause
  }

  const type = typeof cause
  if (type === 'undefined' || type === 'function' || cause === null) {
    return undefined
  }

  // Primitive types just get wrapped in an error
  if (type !== 'object') {
     
    return new Error(String(cause))
  }

  // If it's an object, we'll create a synthetic error
  if (isObject(cause)) {
    const error = new UnknownCauseError()

    for (const key in cause) {
      error[key] = cause[key]
    }

    return error
  }

  return undefined
}

/**
 * Check that value is object
 * @internal
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === 'object'
}
