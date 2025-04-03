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
export class EdenWsError<_T = any> extends Error {}

/**
 * Placeholder class for Eden client errors.
 */
export class EdenClientError<_T = any> extends Error {}

/**
 * All possible errors.
 *
 * Since Eden and Elysia.js are inherently REST and not JSON-RPC, we don't have
 * have strong opinions on the types of permitted errors
 *
 * This type will be used as a central source of truth for the foreseeable future.
 * e.g. If there were ever a decision to tighten the restrictions on permitted errors,
 * this type would help facilitate that.
 */
export type EdenError = EdenFetchError | EdenWsError | EdenClientError | any
