import type { AnyElysia } from 'elysia'

import type { EdenClientError } from './core/errors'
import type { EdenRequestParams } from './core/request'
import { createChain } from './links/internal/create-chain'
import type { EdenClientRuntime, EdenLink } from './links/internal/eden-link'
import type {
  EdenConnectionState,
  OperationContext,
  OperationOptions,
} from './links/internal/operation'
import type { OperationLink } from './links/internal/operation-link'
import { promisifyObservable, share, type Unsubscribable } from './observable'
import type { inferAsyncIterableYield, TypeError } from './utils/types'

export interface EdenSubscriptionObserver<TValue, TError> {
  onStarted: (opts: { context: OperationContext | undefined }) => void

  onData: (value: inferAsyncIterableYield<TValue>) => void

  onError: (err: TError) => void

  onStopped: () => void

  onComplete: () => void

  onConnectionStateChange: (state: EdenConnectionState<TError>) => void
}

/**
 */
export interface EdenCreateClientOptions<T extends AnyElysia> {
  links: EdenLink<T>[]
  transformer?: TypeError<'The transformer property has moved to httpLink/httpBatchLink/wsLink'>
}

/**
 * @internal
 */
export interface EdenClientSubscriptionOptions
  extends Partial<EdenSubscriptionObserver<unknown, EdenClientError<AnyElysia>>>,
    EdenRequestOptions {}

export interface EdenRequestOptions {
  context?: OperationContext
  signal?: AbortSignal
}

export class EdenClient<T extends AnyElysia> {
  private readonly links: OperationLink<T>[]

  public readonly runtime: EdenClientRuntime

  private requestId: number

  constructor(opts: EdenCreateClientOptions<T>) {
    this.requestId = 0

    this.runtime = {}

    // Initialize the links
    this.links = opts.links.map((link) => link(this.runtime))
  }

  private $request<TInput extends EdenRequestParams = any, TOutput = unknown>(
    options: OperationOptions<TInput>,
  ) {
    const chain$ = createChain<AnyElysia, TInput, TOutput>({
      links: this.links as OperationLink<any, any, any>[],
      op: {
        ...options,
        context: options.context ?? {},
        id: ++this.requestId,
      },
    })

    const observable = chain$.pipe(share())

    return observable
  }

  private async requestAsPromise<TInput extends EdenRequestParams = any, TOutput = unknown>(
    options: OperationOptions<TInput>,
  ): Promise<TOutput> {
    const req$ = this.$request<TInput, TOutput>(options)
    const promise = await promisifyObservable(req$)
    return promise.result as TOutput
  }

  public query(path: string, params?: EdenRequestParams, options?: EdenRequestOptions) {
    const promise = this.requestAsPromise<any, unknown>({
      type: 'query',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })

    return promise
  }

  public mutation(path: string, params?: unknown, options?: EdenRequestOptions) {
    const promise = this.requestAsPromise<any, unknown>({
      type: 'mutation',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })

    return promise
  }

  public subscription(
    path: string,
    params: any,
    opts: EdenClientSubscriptionOptions,
  ): Unsubscribable {
    const observable$ = this.$request({
      type: 'subscription',
      path,
      params,
      context: opts.context,
      signal: opts.signal,
    })

    const unsubscribable = observable$.subscribe({
      next(envelope) {
        switch (envelope.result.type) {
          case 'state': {
            opts.onConnectionStateChange?.(envelope.result)
            break
          }

          case 'started': {
            opts.onStarted?.({ context: envelope.context })
            break
          }

          case 'stopped': {
            opts.onStopped?.()
            break
          }

          case 'data': // falls through

          case undefined: {
            opts.onData?.(envelope.result.data)
            break
          }
        }
      },
      error(err) {
        opts.onError?.(err)
      },
      complete() {
        opts.onComplete?.()
      },
    })

    return unsubscribable
  }
}
