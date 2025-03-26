import type { AnyElysia } from 'elysia'

import type { inferErrorShape } from '../trpc/infer'
import type { IsNever } from '../utils/types'

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
 * Compatiblity type for tRPC.
 *
 * tRPC allows you to define a server-side errorFormatter to change the JSON signature of returned errors.
 * This works in their RPC-esque architecture where the errors are coalesced into a common structure.
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/server/src/unstable-core-do-not-import/initTRPC.ts#L72
 *
 * This library aims to be minimal in its server-side handling of data, so it will not
 * coerce responses into a particular format.
 *
 * This means that errors received by the client will be of type {@link EdenFetchError} with
 * the corresponding status and value of the response.
 *
 * This type will "mock" the ability to customize the errorShape in the event that
 * a plugin is created later...or something...
 *
 * @template TErrorShape should always be never,
 * so {@link EdenClientError} and {@link EdenFetchError} are basically synonymous.
 */
export type EdenClientError<T extends AnyElysia, TErrorShape = inferErrorShape<T>> =
  IsNever<TErrorShape> extends true ? EdenFetchError : TErrorShape
