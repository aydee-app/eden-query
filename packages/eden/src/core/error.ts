import type { InferErrors } from './infer'
import type { InternalElysia } from './types'

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
export class EdenFetchError<TStatus extends number = number, TValue = unknown> extends Error {
  constructor(
    public status: TStatus,
    public value: TValue,
  ) {
    super(value + '')
  }
}

/**
 * Placeholder class for WebSocket client errors.
 */
export class EdenWsError<TStatus extends number = number, TValue = unknown> extends Error {
  constructor(
    public status: TStatus,
    public value: TValue,
  ) {
    super(value + '')
  }
}

/**
 * Placeholder class for Eden client errors.
 */
export class EdenClientError<TStatus extends number = number, TValue = unknown> extends Error {
  constructor(
    public status: TStatus,
    public value: TValue,
  ) {
    super(value + '')
  }
}

/**
 * Generic error shape.
 */
export type EdenGenericError = EdenFetchError | EdenWsError | EdenClientError

/**
 * Custom errors need to be registered at the application root and must implement the {@link Error} interface.
 * Routes can throw or return any error type they want.
 */
export type EdenError<T extends InternalElysia = InternalElysia, TErrors = InferErrors<T>> =
  | EdenGenericError
  | EdenFetchError<number, TErrors[keyof TErrors]>
  | EdenWsError<number, TErrors[keyof TErrors]>
  | EdenClientError<number, TErrors[keyof TErrors]>
  | EdenWebSocketClosedError
  | EdenWebSocketError

export interface EdenWebSocketClosedErrorOptions {
  message: string
  cause?: unknown
}

export class EdenWebSocketClosedError extends Error {
  constructor(options: EdenWebSocketClosedErrorOptions) {
    super(options.message, { cause: options.cause })

    this.name = 'TRPCWebSocketClosedError'

    Object.setPrototypeOf(this, EdenWebSocketClosedError.prototype)
  }
}

export class EdenWebSocketError extends Error {}
