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
 * type PossibleErrorResponses =
 *   | EdenFetchError<400, string>
 *   | EdenFetchError<500, string>
 *
 * function handlePossibleErrors(error: PossibleErrorResponses) {
 *   switch (error.status) {
 *     case 400: { ... }
 *     case 500: { ... }
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
 */
export type EdenError<T extends InternalElysia = InternalElysia, TErrors = InferErrors<T>> =
  | EdenFetchError<number, TErrors[keyof TErrors]>
  | EdenWsError<number, TErrors[keyof TErrors]>
  | EdenClientError<number, TErrors[keyof TErrors]>
