import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
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
  TElysia extends AnyElysia,
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
  TElysia extends AnyElysia,
  TInput extends EdenRequestParams = EdenRequestParams,
  TOutput = unknown,
> = (
  options: OperationLinkOptions<TElysia, TInput, TOutput>,
) => OperationLinkResultObservable<TElysia, TOutput>

/**
 * @internal
 */
export type OperationLinkResultObservable<TElysia extends AnyElysia, TOutput> = Observable<
  OperationLinkResult<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>

/**
 */
export type OperationLinkResultObserver<
  TElysia extends AnyElysia = AnyElysia,
  TOutput = unknown,
> = Observer<OperationLinkResult<TOutput, EdenClientError<TElysia>>, EdenClientError<TElysia>>
