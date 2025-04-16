import { isObject } from '../utils/is-object'
import type { EdenErrorResult } from './dto'
import type { EDEN_ERROR_CODE } from './error-codes'
import type { InternalElysia } from './types'

/**
 * Error response.
 *
 * @template T Can be anything when there is no error formatter installed on the server.
 *
 * @TODO Create an error plugin that can format errors to form
 *
 * Combination of a standard tRPC error and an Eden error.
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/server/src/unstable-core-do-not-import/error/formatter.ts#L40
 */
export interface EdenErrorShape<T = EdenErrorData> {
  cause?: unknown

  /**
   */
  code: EDEN_ERROR_CODE

  /**
   */
  message?: string

  /**
   */
  data?: T
}

export interface EdenFetchErrorShape<TStatus extends number = number, TValue = unknown>
  extends EdenErrorShape {
  /**
   * Eden (HTTP) status.
   */
  status?: TStatus

  /**
   * Eden error value.
   */
  value?: TValue
}

/**
 * @TODO
 *
 * Create an error plugin that can format errors or attach additional data.
 * Similar to the transform plugin, maybe it can be opt-in and toggled on via a request header.
 *
 * @internal
 */
export interface EdenErrorData {
  /**
   */
  code: EDEN_ERROR_CODE

  /**
   */
  httpStatus: number

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
export interface EdenErrorOptions<T = EdenErrorShape> {
  /**
   */
  result?: EdenErrorResult<T>

  /**
   */
  cause?: Error

  /**
   */
  meta?: Record<string, unknown>
}

/**
 * Type-safe wrapper around the basic {@link Error}.
 *
 * Combination of the official EdenFetchError, which captures the HTTP status and value of responses,
 * and TRPCClientError, which normalizes the shape of errors.
 *
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/errors.ts#L1
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L52
 */
export class EdenError<
  _TElysa extends InternalElysia = InternalElysia,
  TError extends EdenErrorShape = EdenErrorShape,
> extends Error {
  /**
   * Additional metadata attached to the error, based on tRPC.
   */
  public meta?: Record<string, unknown>

  /**
   * The normalized error shape, based on tRPC.
   */
  error?: TError

  code?: TError['code']

  data?: TError['data']

  constructor(message?: string, options?: EdenErrorOptions<TError>) {
    super(message, options)

    this.meta = options?.meta
    this.error = options?.result?.error
    this.code = options?.result?.error.code
    this.data = options?.result?.error.data
  }

  public static from<
    TElysa extends InternalElysia = InternalElysia,
    TError extends EdenErrorShape = EdenErrorShape,
  >(cause: unknown, options?: EdenErrorOptions<TError>): EdenError<TElysa, TError> {
    if (this.isEdenError(cause)) {
      cause.meta = { ...cause.meta, ...options?.meta }
      return cause as any
    }

    if (isEdenErrorResponse(cause)) {
      return new EdenError(cause.error.error, { ...options, result: cause })
    }

    const message = getMessageFromUnknownError(cause, 'Unknown error')

    return new EdenError(message, { ...options, cause: cause as any })
  }

  /**
   * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L22
   */
  public static isEdenError(cause: unknown): cause is EdenError {
    if (cause instanceof EdenError) return true

    /**
     * @deprecated
     * Delete in next major
     */
    if (cause instanceof Error && cause.name === EdenError.name) return true

    return false
  }
}

/**
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/errors.ts#L1
 */
export class EdenFetchError<TStatus extends number = number, TValue = unknown> extends EdenError<
  any,
  EdenFetchErrorShape<TStatus, TValue>
> {
  constructor(
    public status: TStatus,
    public value: TValue,
  ) {
    super(value + '')
  }
}

/**
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/links/wsLink/wsClient/utils.ts#L11
 */
export class EdenWebSocketError extends EdenError {
  override name = 'EdenWebSocketError'

  constructor(options: EdenWebSocketErrorOptions) {
    const resolvedOptions: EdenErrorOptions = { ...options }

    if (options.code) {
      resolvedOptions.result = {
        response: {} as any,
        error: {
          message: options.code,
          ...options,
          code: options.code,
        },
      }
    }

    super(options.message, resolvedOptions)
  }
}

export interface EdenWebSocketErrorOptions {
  message?: string
  cause?: any
  code?: EDEN_ERROR_CODE
}

/**
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L33
 */
function isEdenErrorResponse(obj: unknown): obj is EdenErrorResult {
  return (
    isObject(obj) &&
    isObject(obj['error']) &&
    typeof obj['error']['code'] === 'number' &&
    typeof obj['error']['message'] === 'string'
  )
}

/**
 * @see https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/client/src/TRPCClientError.ts#L42
 */
function getMessageFromUnknownError(err: unknown, fallback: string): string {
  if (typeof err === 'string') {
    return err
  }

  if (isObject(err) && typeof err['message'] === 'string') {
    return err['message']
  }

  return fallback
}
