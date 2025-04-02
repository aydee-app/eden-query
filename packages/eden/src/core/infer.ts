import Elysia from 'elysia'

import type { IsNever, NormalizeGenerator, ReplaceBlobWithFiles, Stringable } from '../utils/types'
import type { EdenFetchError } from './error'
import type { InternalRouteSchema } from './types'

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
  T['body'] extends Record<string, unknown> ? ReplaceBlobWithFiles<T['body']> : T['body']

/**
 * A success status code is considered to be anything that starts with 2 or 3.
 *
 * This does not validate if the status code contains exactly three digits.
 *
 * e.g. 100, 200, 300.
 */
export type EdenSuccessStatusCode = `${1 | 2 | 3}${string}`

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
export type EdenRouteSuccessResponses<
  T extends InternalRouteSchema = InternalRouteSchema,
  TSuccessResponses = Ok<T['response'], EdenSuccessStatusCode>,
  TSuccessCodes extends keyof T['response'] = Extract<keyof TSuccessResponses, keyof T['response']>,
> = {
  [K in TSuccessCodes]: NormalizeGenerator<T['response'][K]>
}

type Ok<T, U> = {
  [K in keyof T as `${Extract<K, Stringable>}` extends U ? K : never]: T[K]
}

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
export type EdenRouteErrorResponses<
  T extends InternalRouteSchema = InternalRouteSchema,
  TSuccessResponses = Ok<T['response'], EdenSuccessStatusCode>,
  TErrorCodes extends keyof T['response'] = Exclude<keyof T['response'], keyof TSuccessResponses>,
> = {
  [K in TErrorCodes]: NormalizeGenerator<T['response'][K]>
}

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

const app = new Elysia().get('/', (context) => {
  return context.error(100, 'no')
  return context.error(101, 'yes')
  return context.error(102, 'maybe')
  return context.error(103, 'so')
  return context.error(200, 'a')
  return context.error(201, 'b')
  return context.error(202, 'c')
  return context.error(203, 'd')
  return context.error(400, 'a')
  return context.error(401, 'b')
  return context.error(402, 'c')
  return context.error(403, 'd')
})

export type App = (typeof app)['_routes']['index']['get']

export type Successes = EdenRouteSuccessResponses<App>

export type Errors = EdenRouteErrorResponses<App>
