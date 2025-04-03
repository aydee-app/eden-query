import type { EdenRequestParams } from '../core/config'
import type { EdenResult } from '../core/dto'
import type { EdenError } from '../core/error'
import type { InternalElysia } from '../core/types'
import type { Observable } from '../observable'

export const procedures = ['query', 'mutation', 'subscription'] as const

/**
 * @public
 */
export type Procedure = (typeof procedures)[number]

/**
 * An {@link OperationLink} attaches additional metadata to a returned {@link OperationResult}
 */
export type OperationLinkResult<TOutput = any, TError = any> = {
  context?: OperationContext
  result: EdenResult<TOutput, TError>
}

/**
 * @internal
 */
export type OperationLinkResultObservable<TElysia extends InternalElysia, TOutput> = Observable<
  OperationLinkResult<TOutput, EdenError<TElysia>>,
  EdenError<TElysia>
>

/**
 */
export type OperationLinkOptions<
  TElysia extends InternalElysia,
  TInput extends EdenRequestParams = EdenRequestParams,
  TOutput = unknown,
> = {
  op: Operation<TInput>
  next: (op: Operation<TInput>) => OperationLinkResultObservable<TElysia, TOutput>
}

/**
 * @internal
 */
export type OperationLink<
  TElysia extends InternalElysia,
  TInput extends EdenRequestParams = EdenRequestParams,
  TOutput = unknown,
> = (
  options: OperationLinkOptions<TElysia, TInput, TOutput>,
) => OperationLinkResultObservable<TElysia, TOutput>

/**
 * Options to create an operation. Typically, the operation ID and context will be managed
 * by a link, and they are not required when initiating an operation.
 *
 * @see https://github.com/trpc/trpc/blob/187dfb41c28ef88117fd289859f84e4b101e3e34/packages/client/src/links/types.ts#L26
 */
export interface OperationOptions<T extends EdenRequestParams = EdenRequestParams> {
  type: Procedure
  path: string
  context?: OperationContext
  signal?: AbortSignal
  params: T
}

/**
 * This interface can be extended if custom links mutate the context.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L18C1-L21C69
 */
export interface OperationContext extends Record<string, unknown> {}

/**
 * An initialized operation will have an ID and context that other operation handlers can use.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/types.ts#L26
 */
export interface Operation<T extends EdenRequestParams = EdenRequestParams>
  extends OperationOptions<T> {
  id: number
  context: OperationContext
}

/**
 * The data that is used to initialize every link internally.
 *
 * Each link is a function that returns an initialization function that is invoked internally.
 * Since there is no data in the client runtime, it's basically just a thunk.
 */
export type EdenClientRuntime = {}

/**
 * @public
 */
export type EdenLink<T extends InternalElysia = InternalElysia> = (
  opts: EdenClientRuntime,
) => OperationLink<T>
