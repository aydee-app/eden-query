import type { EdenClientError } from '../../core/errors'
import type { InternalElysia } from '../../elysia'
import type { Observable, Observer } from '../../observable'
import type { Operation, OperationContext, OperationResult } from './operation'

/**
 * An {@link OperationLink} attaches additional metadata to a returned {@link OperationResult}
 */
export type OperationLinkResult<TOutput = any, TError = any> = {
  context?: OperationContext
  result: OperationResult<TOutput, TError>
}

/**
 */
export type OperationLinkOptions<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
  TOutput = unknown,
> = {
  op: Operation<TElysia, TKey>
  next: (op: Operation<TElysia, TKey>) => OperationLinkResultObservable<TElysia, TOutput>
}

/**
 * @internal
 */
export type OperationLink<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
  TOutput = unknown,
> = (
  options: OperationLinkOptions<TElysia, TKey, TOutput>,
) => OperationLinkResultObservable<TElysia, TOutput>

/**
 * @internal
 */
export type OperationLinkResultObservable<
  TElysia extends InternalElysia = InternalElysia,
  TOutput = unknown,
> = Observable<OperationLinkResult<TOutput, EdenClientError<TElysia>>, EdenClientError<TElysia>>

/**
 */
export type OperationLinkResultObserver<
  TElysia extends InternalElysia = InternalElysia,
  TOutput = unknown,
> = Observer<OperationLinkResult<TOutput, EdenClientError<TElysia>>, EdenClientError<TElysia>>
