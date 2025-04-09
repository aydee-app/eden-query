import { isObject } from '../utils/is-object'
import type { Nullish } from '../utils/types'
import type { EdenErrorResponse } from './dto'
import type { EDEN_ERROR_CODE } from './error-codes'

/**
 * Type-safe wrapper around the basic {@link Error}.
 *
 * Elysia.js provides strongly-typed routes that map numeric status codes to types.
 *
 * @example
 *
 * ```json
 * {
 *   200: string,
 *   400: string
 *   500: string
 * }
 * ```
 *
 * Based on this mapping, we can derive an error response mapping that looks like this.
 *
 * ```ts
 * class MyError extends Error {
 *   name = 'MyError'
 *   message = 'MyMessage'
 * }
 *
 * type PossibleErrorResponses =
 *   | EdenFetchError<400, string>
 *   | EdenFetchError<500, string>
 *   | EdenFetchError<600, MyError>
 *
 * function handlePossibleErrors(error: PossibleErrorResponses) {
 *   switch (error.status) {
 *     case 400: { ... }
 *     case 500: { ... }
 *     case 600: {
 *       const myError: MyError = error.value
 *
 *       console.log(myError.name)
 *       console.log(myError.message)
 *
 *       break
 *     }
 *     default: { ... }
 *   }
 * }
 * ```
 */
export class EdenError<_T = any> extends Error {
  public meta?: Record<string, unknown>

  public result?: EdenErrorResponse | Nullish

  constructor(message?: string, options?: EdenErrorOptions) {
    super(message, { cause: options?.cause })

    this.meta = options?.meta
    this.result = options?.result
  }

  public static from(cause: unknown, options?: EdenErrorOptions): EdenError {
    if (this.isEdenClientError(cause)) {
      if (options?.meta) {
        // Decorate with meta error data
        cause.meta = {
          ...cause.meta,
          ...options.meta,
        }
      }
      return cause
    }

    if (isEdenErrorResponse(cause)) {
      return new EdenError(cause.error.error, { ...options, result: cause })
    }

    const message = getMessageFromUnknownError(cause, 'Unknown error')

    return new EdenError(message, { ...options, cause: cause as any })
  }

  public static isEdenClientError(cause: unknown): cause is EdenError {
    return (
      cause instanceof EdenError ||
      /**
       * @deprecated
       * Delete in next major
       */
      (cause instanceof Error && cause.name === EdenError.name)
    )
  }
}

export class EdenFetchError<TStatus extends number = number, TValue = any> extends EdenError {
  public status: TStatus

  public value: TValue

  constructor(status: TStatus, value: TValue, options?: EdenErrorOptions) {
    const message = value + ''

    super(message, options)

    this.status = status
    this.value = value
  }
}

function isEdenErrorResponse(obj: unknown): obj is EdenErrorResponse {
  return (
    isObject(obj) &&
    isObject(obj['error']) &&
    typeof obj['error']['code'] === 'number' &&
    typeof obj['error']['message'] === 'string'
  )
}

function getMessageFromUnknownError(err: unknown, fallback: string): string {
  if (typeof err === 'string') {
    return err
  }

  if (isObject(err) && typeof err['message'] === 'string') {
    return err['message']
  }

  return fallback
}

/**
 * Error response
 */
export interface EdenErrorShape<T> {
  code: EDEN_ERROR_CODE
  message: string
  data: T
}

export interface EdenErrorOptions {
  result?: EdenErrorResponse | Nullish
  cause?: Error | Nullish
  meta?: Record<string, unknown>
}

export interface EdenWebSocketClosedErrorOptions {
  message: string
  cause?: unknown
}

export class EdenWebSocketClosedError extends Error {
  public status = undefined

  public value = undefined

  constructor(options: EdenWebSocketClosedErrorOptions) {
    super(options.message, { cause: options.cause })

    this.name = 'TRPCWebSocketClosedError'

    Object.setPrototypeOf(this, EdenWebSocketClosedError.prototype)
  }
}
