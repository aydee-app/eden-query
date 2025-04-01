import type { InternalRouteSchema } from '../elysia'
import type {
  IsNever,
  IsUnknown,
  ReplaceBlobWithFiles,
  ReplaceGeneratorWithAsyncGenerator,
  Stringable,
} from '../utils/types'
import type { EdenFetchError } from './errors'

/**
 * The following types assume a Elysia.js {@link InternalRouteSchema} that looks like the following.
 *
 * ```json
 * {
 *   body: string,
 *   params: {
 *     id: string
 *   },
 *   query: {
 *     count: number
 *   },
 *   headers: unknown,
 *   response: {
 *     100: "Custom error",
 *     200: "OK",
 *     400: "Bad",
 *     500: "Not OK",
 *     422: {
 *       type: "validation",
 *       on: string,
 *       summary?: string,
 *       message?: string,
 *       found?: unknown,
 *       property?: string,
 *       expected?: string
 *     }
 *   }
 * }
 * ```
 */

/**
 * An object with the `params` property representing strongly-typed {@link InternalRouteSchema.params}.
 *
 * @template T The Elysia.js {@link InternalRouteSchema}.
 */
export type EdenRouteParams<T extends InternalRouteSchema> =
  IsNever<keyof T['params']> extends true
    ? {
        params?: Record<never, string>
      }
    : {
        params: T['params']
      }

/**
 * An object with the `query` property representing strongly-typed {@link InternalRouteSchema.query}.
 *
 * @template TRoute The Elysia.js {@link InternalRouteSchema}.
 *
 * @template TOmitInput
 *   Helper type to exclude certain keys from the query input.
 *   Used primarily to omit the `cursor` property for infinite queries.
 *   This is because the cursor will be managed by tanstack-query and the user does not pass it in manually.
 */
export type EdenRouteQuery<
  TRoute extends InternalRouteSchema,
  TOmitInput extends string | number | symbol = never,
> =
  IsNever<keyof TRoute['query']> extends true
    ? {
        query?: Record<never, string>
      }
    : {
        query: Omit<TRoute['query'], TOmitInput>
      }

/**
 * An object with the `headers` property representing strongly-typed {@link RouteSchema.headers}.
 * query?: any
 *
 * @template T The Elysia.js {@link InternalRouteSchema}.
 *
 */
export type EdenRouteHeaders<T extends InternalRouteSchema> = undefined extends T['headers']
  ? {
      headers?: Record<string, string>
    }
  : {
      headers: T['headers']
    }

/**
 * @template TRoute The Elysia.js {@link InternalRouteSchema}.
 *
 * @template TOmitInput
 *   Helper type to exclude certain keys from the query input.
 *   Used primarily to omit the `cursor` property for infinite queries.
 *   This is because the cursor will be managed by tanstack-query and the user does not pass it in manually.
 */
export type EdenRouteOptions<
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TOmitInput extends string | number | symbol = never,
> = EdenRouteParams<TRoute> & EdenRouteQuery<TRoute, TOmitInput> & EdenRouteHeaders<TRoute>

/**
 * @template T The Elysia.js {@link InternalRouteSchema}.
 */
export type EdenRouteBody<T extends InternalRouteSchema = InternalRouteSchema> =
  IsUnknown<T['body']> extends false
    ? undefined extends T['body']
      ? ReplaceBlobWithFiles<T['body']> | undefined
      : ReplaceBlobWithFiles<T['body']>
    : unknown

/**
 * A success status code is considered to be anything that starts with 2 or 3.
 *
 * This does not validate if the status code contains exactly three digits.
 *
 * e.g. 100, 200, 300.
 */
export type EdenSuccessStatusCodeString = `${1 | 2 | 3}${string}`

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to success responses.
 *
 * @example
 *
 * ```ts
 * type Response = {
 *   100: 'Info',
 *   200: 'OK',
 *   300: 'Redirected',
 *   400: 'Not found',
 *   500: 'Server failed',
 * }
 *
 * type Result = EdenRouteSuccessOutput<Response>
 * //   ^?  Result = { 100: 'Info', 200: 'OK', 300: 'Redirected' }
 *
 * function handleSuccess(possibleSuccessResponses: Result[keyof Result]) {
 *   // logic...
 * }
 * ```
 *
 * The logic iterates over every key in the response map, converts the number to a string
 * template, and checks whether it has the same signature as a success status code.
 *
 * If the number does correlate to a success, then keep the key and value; otherwise
 * omit it.
 *
 * @remarks
 * As the example demonstrates, this library does not provide any wrapping around success
 * responses. This differs from errors because those will be wrapped with an {@link EdenFetchError},
 * and each one contains the original status of the error response.
 */
export type EdenRouteSuccessResponses<T extends InternalRouteSchema = InternalRouteSchema> =
  T['response'] extends Record<number, unknown>
    ? ReplaceGeneratorWithAsyncGenerator<{
        [K in keyof T as `${Extract<K, Stringable>}` extends EdenSuccessStatusCodeString
          ? K
          : never]: T[K]
      }>
    : never

/**
 * Gets a union of all the possible success responses for the Elysia.js route.
 *
 * @remarks
 * This library does not provide any wrapping around success responses.
 * This differs from errors because those will be wrapped with an {@link EdenFetchError},
 * and each one contains the original status of the error response.
 */
export type EdenRouteSuccess<
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TSuccessResponses = EdenRouteSuccessResponses<TRoute>,
> = TSuccessResponses[keyof TSuccessResponses]

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to error responses.
 *
 * @example
 *
 * ```ts
 * type Response = {
 *   100: 'Info',
 *   200: 'OK',
 *   300: 'Redirected',
 *   400: 'Not found',
 *   500: 'Server failed',
 *   600: 'Custom error',
 * }
 *
 * type Result = EdenRouteErrorOutput<Response>
 * //   ^?  Result = { 400: 'Not found', 500: 'Server failed', 600: 'Custom error' }
 * ```
 *
 * The logic iterates over every key in the response map, converts the number to a string
 * template, and checks whether it has the same signature as a success status code.
 *
 * Opposite to {@link EdenRouteSuccessResponses}, it will omit the key if it DOES
 * correlate with a success code.
 */
export type EdenRouteErrorResponses<T extends InternalRouteSchema = InternalRouteSchema> =
  T['response'] extends Record<number, unknown>
    ? ReplaceGeneratorWithAsyncGenerator<{
        [K in keyof T as `${Extract<K, Stringable>}` extends EdenSuccessStatusCodeString
          ? never
          : K]: T[K]
      }>
    : never

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to error responses.
 *
 * @example
 *
 * ```ts
 * type Response = {
 *   100: 'Info',
 *   200: 'OK',
 *   300: 'Redirected',
 *   400: 'Not found',
 *   500: 'Server failed',
 *   600: 'Custom Error'
 * }
 *
 * type Result = EdenRouteError<Response>
 * //   ^?  Result = EdenFetchError<400, 'Not found'> | EdenFetchError<500, 'Server failed'> | EdenFetchError<600, 'Custom error'>
 *
 * function handleError(possibleErrors: Result) {
 *     case 400: { ... }
 *     case 500: { ... }
 *     case 600: { ... }
 *     default: { ... }
 * }
 * ```
 *
 * The logic iterates over every key in the response map, converts the number to a string
 * template, and checks whether it has the same signature as a success status code.
 *
 * Opposite to {@link EdenRouteSuccessResponses}, it will omit the key if it DOES
 * correlate with a success code.
 *
 * This library will wrap all errors within an {@link EdenFetchError} which contain a
 * type-safe {@link EdenFetchError.status} that can be used to perform type discrimination.
 */
export type EdenRouteError<
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TSuccessResponses = EdenRouteErrorResponses<TRoute>,
> = {
  [K in keyof TSuccessResponses]: EdenFetchError<Extract<K, number>, TSuccessResponses[K]>
}[keyof TSuccessResponses]
