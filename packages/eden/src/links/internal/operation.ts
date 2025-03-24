import type { AnyElysia } from 'elysia'

import type { EdenResultMessage, EdenSuccessResponse } from '../../envelopes'
import type { TypeError } from '../../errors'
import type { EdenRequestParams } from '../../resolve'
import type { EdenConnectionState } from '../../subscriptions'
import type { Observable, Observer } from './observable'

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/internals/TRPCUntypedClient.ts#L23
 */
export type OperationType = 'query' | 'mutation' | 'subscription'

/**
 * Mutatable state shared between links.
 *
 * @see https://trpc.io/docs/client/links#managing-context
 *
 * This interface can technically be extended via global module augmentation for
 * developers to leverage.
 */
export interface OperationContext extends Record<string, unknown> {}

/**
 * A task that is handled by a chain of links.
 * Whenever an operation is initiated, it is passed to every link in the chain in sequential order.
 *
 * @see https://trpc.io/docs/client/links
 *
 * An operation contains the parameters that are used for the request itself,
 * as well as metadata that is only relevant to other operations in the chain.
 *
 * @see https://github.com/trpc/trpc/blob/main/packages/client/src/links/types.ts#L26
 *
 * @template T
 * The input to the operation. i.e. {@link EdenRequestParams} for the request.
 * It is passed directly to the request resolver.
 */
export type Operation<T extends EdenRequestParams = any> = {
  /**
   * A unique ID of the operation.
   */
  id: number

  /**
   * The type of operation.
   *
   * In the context of tRPC, GraphQL, this closely correlates to the HTTP request method,
   * e.g. GET for queries and POST for mutations.
   *
   * In the context of eden-query, this mostly indicates the tanstack-query hook or request intent.
   *
   * e.g.
   *
   * A query correlates pure data retrieval and thus `useQuery`.
   * A mutation correlates with updating backend state, and thus `useMutation`.
   * Subscriptions are not handled out of the box by tanstack-query, and custom hooks are implemented for this type.
   */
  type: OperationType

  /**
   * Mutable, shared context between operations.
   */
  context: OperationContext

  /**
   * Operation path and input are not stored at the top level of the operation,
   * since there can be many properties and using a sub-property improves scoping.
   */
  params: T
}

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/types.ts#L95
 */
export type OperationLink<
  TElysia extends AnyElysia = AnyElysia,
  TInput extends EdenRequestParams = any,
  TOutput = unknown,
> = (
  options: OperationLinkOptions<TElysia, TInput, TOutput>,
) => OperationResultObservable<TElysia, TOutput>

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/types.ts#L99-L103
 */
export type OperationLinkOptions<
  TElysia extends AnyElysia = AnyElysia,
  TInput extends EdenRequestParams = any,
  TOutput = unknown,
> = {
  /**
   * The operation that is being handled.
   */
  operation: Operation<TInput>

  /**
   * The client will keep track of the current link being executed and provide it
   * a callback to call if the operation should be passed to the next link.
   *
   * Calling the next link will return an observable that allows the current link to
   * continue participating in the request and interacting
   */
  next: (operation: Operation<TInput>) => OperationResultObservable<TElysia, TOutput>
}

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/links/types.ts#L84
 */
export type OperationResultObservable<TElysia extends AnyElysia, TOutput> = Observable<
  OperationResultEnvelope<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>

export type OperationResultObserver<TElysia extends AnyElysia, TOutput> = Observer<
  OperationResultEnvelope<TOutput, EdenClientError<TElysia>>,
  EdenClientError<TElysia>
>

/**
 * @internal
 */
export interface OperationResultEnvelope<TOutput, TError> {
  result:
    | EdenResultMessage<TOutput>['result']
    | EdenSuccessResponse<TOutput>['result']
    | EdenConnectionState<TError>
  context?: OperationContext
}

export type EdenLink<T extends AnyElysia = any, TMeta = {}> = ((
  opts: EdenClientRuntime,
) => OperationLink<T>) &
  TMeta

/**
 * The data that is used to initialize every link internally.
 *
 * Each link is a function that returns an initialization function that is invoked internally.
 * Since there is no data in the client runtime, it's basically just a thunk.
 */
export type EdenClientRuntime = {}

/**
 * @internal
 *
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/internals/TRPCUntypedClient.ts#L42
 */
export type EdenClientOptions<T extends AnyElysia> = {
  links: EdenLink<T>[]
  transformer?: TypeError<'The transformer property has moved to httpLink/httpBatchLink/wsLink'>
}

/**
 * TODO: placeholder for TRPCClientError<TInferrable>.
 */
export type EdenClientError<_T extends AnyElysia> = any

export class OperationError extends Error {
  constructor(message?: string) {
    super(message)
  }
}
