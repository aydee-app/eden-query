import type { AnyElysia } from 'elysia'

import type { EdenClientError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import type { Observable } from './observable'
import type { Operation, OperationResultEnvelope } from './operation'

/**
 * @internal
 */
export type OperationLink<
  TElysia extends AnyElysia,
  TInput extends EdenRequestParams = any,
  TOutput = unknown,
> = (opts: {
  op: Operation<TInput>
  next: (op: Operation<TInput>) => OperationResultObservable<TElysia, TOutput>
}) => OperationResultObservable<TElysia, TOutput>

/**
 * @internal
 */
export type OperationResultObservable<TElysia extends AnyElysia, TOutput> = Observable<
  OperationResultEnvelope<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>
