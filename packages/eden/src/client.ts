import type { AnyElysia } from 'elysia'

import { createChain } from './links/internal/create-chain'
import { promisifyObservable, type Unsubscribable } from './links/internal/observable'
import type {
  EdenClientError,
  EdenClientOptions,
  EdenClientRuntime,
  OperationContext,
  OperationLink,
  OperationType,
} from './links/internal/operation'
import { share } from './links/internal/operators'
import type { EdenResponse } from './request'
import type { EdenRequestParams } from './resolve'

export type EdenSubscriptionObserver<TValue, TError> = {
  onStarted: () => void
  onData: (value: TValue) => void
  onError: (err: TError) => void
  onStopped: () => void
  onComplete: () => void
}

/**
 * Utility type that represents a helper function for initializing an eden client.
 *
 * @template T Elysia.js application instance type.
 * @param options Eden client initialization options.
 * @returns Eden client for making requests to an Elysia.js backend.
 */
export type EdenCreateClient<T extends AnyElysia = AnyElysia> = (
  options: EdenClientOptions<T>,
) => EdenClient<T>

/**
 * Options that are passed directly to {@link EdenClient} request methods.
 *
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/internals/TRPCUntypedClient.ts#L61-L67
 */
export type EdenClientInternalRequestOptions<T = any> = {
  type: OperationType
  context?: OperationContext
  params: T
}

export type EdenClientPromisifyRequestOptions = EdenClientInternalRequestOptions & {
  signal?: AbortSignal
}

export type EdenClientRequestOptions = {
  context?: OperationContext
  signal?: AbortSignal
}

/**
 * Based on the TRPCUntypedClient from tRPC.
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/client/src/internals/TRPCUntypedClient.ts#L42
 */
export class EdenClient<TElysia extends AnyElysia = AnyElysia> {
  private readonly links: OperationLink<TElysia>[]

  public readonly runtime: EdenClientRuntime

  private requestId: number

  constructor(options: EdenClientOptions<TElysia>) {
    this.requestId = 0

    /**
     * @todo Figure out what this should contain...
     */
    this.runtime = {}

    // Initialize the links.
    this.links = options.links.map((link) => link(this.runtime))
  }

  private $request<TInput extends EdenRequestParams = any, TOutput = unknown>(
    options: EdenClientInternalRequestOptions<TInput>,
  ) {
    const chain$ = createChain<TElysia, TInput, TOutput>({
      links: this.links as OperationLink<any, any, any>[],
      operation: {
        id: ++this.requestId,
        ...options,
        context: options.context ?? {},
      },
    })
    return chain$.pipe(share())
  }

  private promisifyRequest<TInput extends EdenRequestParams = any, TOutput = unknown>(
    options: EdenClientPromisifyRequestOptions,
  ): Promise<TOutput> {
    // Forward the signal
    if (options.signal != null) {
      options.params.fetch ??= {}
      options.params.fetch.signal = options.signal
    }

    const signal = options.params.fetch?.signal

    const req$ = this.$request<TInput, TOutput>(options)

    const { promise, abort } = promisifyObservable<TOutput>(req$ as any)

    const abortablePromise = new Promise<TOutput>((resolve, reject) => {
      signal?.addEventListener('abort', abort)
      promise.then(resolve).catch(reject)
    })

    return abortablePromise
  }

  public query(params: EdenRequestParams, options?: EdenClientRequestOptions) {
    return this.promisifyRequest<any, EdenResponse>({
      type: 'query',
      params,
      context: options?.context,
      signal: options?.signal,
    })
  }

  public mutation(params: EdenRequestParams, options?: EdenClientRequestOptions) {
    return this.promisifyRequest({
      type: 'mutation',
      params,
      context: options?.context,
      signal: options?.signal,
    })
  }

  public subscription(
    params: EdenRequestParams<TElysia>,
    options?: Partial<EdenSubscriptionObserver<unknown, EdenClientError<TElysia>>> &
      EdenClientRequestOptions,
  ): Unsubscribable {
    const observable = this.$request({
      type: 'subscription',
      params,
      context: options?.context,
    })

    const $observable = observable.subscribe({
      next: (envelope) => {
        switch (envelope.result.type) {
          case 'started': {
            return options?.onStarted?.()
          }
          case 'stopped': {
            return options?.onStopped?.()
          }
          default: {
            return options?.onData?.(envelope.result.data)
          }
        }
      },
      error: (err) => {
        options?.onError?.(err)
      },
      complete: () => {
        options?.onComplete?.()
      },
    })

    return $observable
  }
}
