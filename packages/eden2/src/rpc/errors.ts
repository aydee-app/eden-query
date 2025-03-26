import type { RouteSchema, StatusMap } from 'elysia'

import type { ExtractString, Nullish } from '../utils/types'

/**
 * @template T {@link RouteSchema.response}
 * A route defines its responses as a Record<number, any>, mapping status to response type.
 *
 * Error responses are all keys that don't being with 1, 2 or 3, e.g. not status codes from 100-399.
 */
export type ExtractErrorResponses<T extends Record<string, any>> = {
  [K in keyof T as `${ExtractString<K>}` extends `${1 | 2 | 3}${string}` ? never : K]: T
}

export type InferRouteErrorShape<T extends RouteSchema> = {
  shape: any
  message: any
  code: any
  data: any
}

export type TRPC_ERROR_CODE_KEY = keyof StatusMap

export type TRPC_ERROR_CODE_NUMBER = StatusMap[keyof StatusMap]

/**
 * Error response
 */
export interface TRPCErrorShape<TData extends object = object> {
  code: TRPC_ERROR_CODE_NUMBER
  message: string
  data: TData
}

/**
 * @internal
 */
export type DefaultErrorData = {
  code: TRPC_ERROR_CODE_KEY

  httpStatus: number

  /**
   * Path to the procedure that threw the error
   */
  path?: string

  /**
   * Stack trace of the error (only in development)
   */
  stack?: string
}

/**
 * @internal
 */
export interface DefaultErrorShape extends TRPCErrorShape<DefaultErrorData> {
  message: string
  code: TRPC_ERROR_CODE_NUMBER
}

export interface TRPCClientErrorBase<TShape extends DefaultErrorShape> {
  readonly message: string

  readonly shape?: TShape | Nullish

  readonly data?: TShape['data'] | Nullish
}

export class EdenClientError<
    T extends RouteSchema,
    TShape extends InferRouteErrorShape<T> = InferRouteErrorShape<T>,
  >
  extends Error
  implements TRPCClientErrorBase<InferRouteErrorShape<T>>
{
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override doesn't work in all environments due to "This member cannot have an 'override' modifier because it is not declared in the base class 'Error'"
  public override readonly cause

  public readonly shape?: TShape | Nullish

  public readonly data?: TShape['data'] | Nullish

  /**
   * Additional meta data about the error
   * In the case of HTTP-errors, we'll have `response` and potentially `responseJSON` here
   */
  public meta

  constructor(
    message: string,
    opts?: {
      result?: TRPCErrorResponse<TShape> | Nullish
      cause?: Error
      meta?: Record<string, unknown>
    },
  ) {
    const cause = opts?.cause

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore https://github.com/tc39/proposal-error-cause
    super(message, { cause })

    this.meta = opts?.meta

    this.cause = cause
    this.shape = opts?.result?.error
    this.data = opts?.result?.error.data
    this.name = 'TRPCClientError'

    Object.setPrototypeOf(this, EdenClientError.prototype)
  }

  public static from<TRoute extends RouteSchema>(
    _cause: Error | TRPCErrorResponse<any> | object,
    opts: { meta?: Record<string, unknown> } = {},
  ): EdenClientError<TRoute> {
    const cause = _cause as unknown

    if (isTRPCClientError(cause)) {
      if (opts.meta) {
        // Decorate with meta error data
        cause.meta = {
          ...cause.meta,
          ...opts.meta,
        }
      }

      return cause
    }

    if (isTRPCErrorResponse(cause)) {
      return new EdenClientError(cause.error.message, {
        ...opts,
        result: cause,
      })
    }

    return new EdenClientError(getMessageFromUnknownError(cause, 'Unknown error'), {
      ...opts,
      cause: cause as any,
    })
  }
}
