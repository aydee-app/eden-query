import type { Get, IsNever, NormalizeGenerator, ReplaceBlobWithFiles } from '../utils/types'
import type { EdenFetchError } from './error'
import type { HttpNonErrorStatus, HttpSuccessStatus } from './http'
import type { InternalElysia, InternalRouteSchema } from './types'

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
 *     100: "Informational message",
 *     200: "OK",
 *     201: "Success",
 *     400: "Client error",
 *     500: "Server error",
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
        params?: Record<string, string>
      }
    : {} extends T['params']
      ? {
          params: T['params']
        }
      : {
          params: T['params']
        }

/**
 * An object with the `query` property representing strongly-typed {@link InternalRouteSchema.query}.
 *
 * @template TRoute The Elysia.js {@link InternalRouteSchema}.
 * @template TOmitInput
 *   Helper type to exclude certain keys from the query input.
 *   Used primarily to omit the `cursor` property for infinite queries.
 *   This is because the cursor will be managed by tanstack-query and the user does not pass it in manually.
 */
export type EdenRouteQuery<
  TRoute extends InternalRouteSchema,
  TOmitInput extends PropertyKey = never,
> =
  IsNever<keyof TRoute['query']> extends true
    ? {
        query?: Record<string, string>
      }
    : {} extends Omit<TRoute['query'], TOmitInput>
      ? {
          query?: Omit<TRoute['query'], TOmitInput>
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
  : {} extends T['headers']
    ? {
        headers?: T['headers']
      }
    : {
        headers: T['headers']
      }

/**
 * @template TRoute The Elysia.js {@link InternalRouteSchema}.
 * @template TOmitInput
 *   Helper type to exclude certain keys from the query input.
 *   Used primarily to omit the `cursor` property for infinite queries.
 *   This is because the cursor will be managed by tanstack-query and the user does not pass it in manually.
 */
export type EdenRouteOptions<
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TOmitInput extends PropertyKey = never,
> = EdenRouteParams<TRoute> & EdenRouteQuery<TRoute, TOmitInput> & EdenRouteHeaders<TRoute>

/**
 * @template T The Elysia.js {@link InternalRouteSchema}.
 */
export type EdenRouteBody<T extends InternalRouteSchema = InternalRouteSchema> =
  T['body'] extends Record<string, unknown> ? ReplaceBlobWithFiles<T['body']> : T['body']

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to success responses.
 *
 * @example
 *
 * ```ts
 * type Responses = {
 *   100: 'Information',
 *   200: 'OK',
 *   201: 'Success',
 *   300: 'Redirected',
 *   400: 'Client error',
 *   500: 'Server error',
 * }
 *
 * type Result = RouteSuccessResponses<Responses>
 * //   ^?  Result = { 200: 'OK', 201: 'Success' }
 *
 * function handleSuccess(possibleSuccessResponses: Result[keyof Result]) {
 *   // logic...
 * }
 * ```
 *
 */
export type RouteSuccessResponses<
  T extends InternalRouteSchema = InternalRouteSchema,
  TSuccessStatuses extends keyof T['response'] = Extract<keyof T['response'], HttpSuccessStatus>,
> = {
  [K in TSuccessStatuses]: NormalizeGenerator<T['response'][K]>
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
  TSuccessResponses = RouteSuccessResponses<TRoute>,
> = TSuccessResponses[keyof TSuccessResponses]

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to error responses.
 *
 * @example
 *
 * ```ts
 * type Response = {
 *   100: 'Information',
 *   200: 'OK',
 *   201: 'Success',
 *   300: 'Redirected',
 *   400: 'Client error',
 *   500: 'Server error',
 *   600: 'Custom error',
 * }
 *
 * type Result = RouteErrorResponses<Response>
 * //   ^?  Result = { 400: 'Client error', 500: 'Server error', 600: 'Custom error' }
 * ```
 *
 */
export type RouteErrorResponses<
  T extends InternalRouteSchema = InternalRouteSchema,
  TErrorStatuses extends keyof T['response'] = Exclude<keyof T['response'], HttpNonErrorStatus>,
> = {
  [K in TErrorStatuses]: NormalizeGenerator<T['response'][K]>
}

/**
 * Some errors that are generally possible on any routes.
 */
export type DefaultEdenFetchErrors = EdenFetchError<500, any>

/**
 * Extract the keys from the {@link InternalRouteSchema.response} that correspond to error responses.
 *
 * @example
 *
 * ```ts
 * type Response = {
 *   100: 'Information',
 *   200: 'OK',
 *   201: 'Success',
 *   300: 'Redirected',
 *   400: 'Client error',
 *   500: 'Server error',
 *   600: 'Custom error',
 * }
 *
 * type Result = EdenRouteError<Response>
 * //   ^?  Result = EdenFetchError<400, 'Client error'> | EdenFetchError<500, 'Server error'> | EdenFetchError<600, 'Custom error'>
 *
 * function handleError(possibleErrors: Result) {
 *     case 400: { ... }
 *     case 500: { ... }
 *     case 600: { ... }
 *     default: { ... }
 * }
 * ```
 *
 * This library will wrap all errors within an {@link EdenFetchError} which contain a
 * type-safe {@link EdenFetchError.status} that can be used to perform type discrimination.
 */
export type EdenRouteError<
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TSuccessResponses = RouteErrorResponses<TRoute>,
> =
  | {
      [K in keyof TSuccessResponses]: EdenFetchError<Extract<K, number>, TSuccessResponses[K]>
    }[keyof TSuccessResponses]
  | DefaultEdenFetchErrors

/**
 * Based on tRPC error inference.
 * @see https://github.com/trpc/trpc/blob/f6efa479190996c22bc1e541fdb1ad6a9c06f5b1/packages/client/src/TRPCClientError.ts#L12
 *
 * This returns an object mapping of errors. This only recognizes custom errors registered
 * on the application.
 * @see https://elysiajs.com/essential/life-cycle.html#custom-error
 */
export type InferErrors<T extends InternalElysia = InternalElysia> = Get<
  T['_types'],
  ['Definitions', 'error']
>
