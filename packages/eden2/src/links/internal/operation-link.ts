import type { EdenClientError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
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
 * @internal
 */
export type OperationLinkResultObservable<TElysia extends InternalElysia, TOutput> = Observable<
  OperationLinkResult<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>

/**
 */
export type OperationLinkResultObserver<
  TElysia extends InternalElysia = InternalElysia,
  TOutput = unknown,
> = Observer<OperationLinkResult<TOutput, EdenClientError<TElysia>>, EdenClientError<TElysia>>
