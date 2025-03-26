import type { AnyElysia } from 'elysia'

import type { EdenClientError } from './core/errors'
import type { EdenRequestParams } from './core/request'
import { createChain } from './links/internal/create-chain'
import type { EdenClientRuntime, EdenLink } from './links/internal/eden-link'
import { observableToPromise, type Unsubscribable } from './links/internal/observable'
import type { OperationContext } from './links/internal/operation'
import type { OperationLink } from './links/internal/operation-link'
import { share } from './links/internal/operators'
import type { EdenConnectionState } from './links/internal/subscription'
import type { inferAsyncIterableYield, Nullish, TypeError } from './utils/types'

type TRPCType = 'mutation' | 'query' | 'subscription'

export interface TRPCSubscriptionObserver<TValue, TError> {
  onStarted: (opts: { context: OperationContext | undefined }) => void
  onData: (value: inferAsyncIterableYield<TValue>) => void
  onError: (err: TError) => void
  onStopped: () => void
  onComplete: () => void
  onConnectionStateChange: (state: EdenConnectionState<TError>) => void
}

/**
 * @internal
 */
export type EdenCreateClientOptions<T extends AnyElysia> = {
  links: EdenLink<T>[]
  transformer?: TypeError<'The transformer property has moved to httpLink/httpBatchLink/wsLink'>
}

export type EdenRequestOptions = {
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

  private $request<TInput extends EdenRequestParams = any, TOutput = unknown>(opts: {
    type: TRPCType
    params: TInput
    path: string
    context?: OperationContext
    signal?: AbortSignal | Nullish
  }) {
    const chain$ = createChain<AnyElysia, TInput, TOutput>({
      links: this.links as OperationLink<any, any, any>[],
      op: {
        ...opts,
        context: opts.context ?? {},
        id: ++this.requestId,
      },
    })

    const a = chain$.pipe(share())
    return a
  }

  private async requestAsPromise<TInput extends EdenRequestParams = any, TOutput = unknown>(opts: {
    type: TRPCType
    params: TInput
    path: string
    context?: OperationContext
    signal?: AbortSignal | Nullish
  }): Promise<TOutput> {
    const req$ = this.$request<TInput, TOutput>(opts)

    const promise = await observableToPromise<any>(req$)

    return promise
  }

  public query(path: string, params?: unknown, opts?: EdenRequestOptions) {
    return this.requestAsPromise<any, unknown>({
      type: 'query',
      path,
      params,
      context: opts?.context,
      signal: opts?.signal,
    })
  }

  public mutation(path: string, params?: unknown, opts?: EdenRequestOptions) {
    return this.requestAsPromise<any, unknown>({
      type: 'mutation',
      path,
      params,
      context: opts?.context,
      signal: opts?.signal,
    })
  }

  public subscription(
    path: string,
    params: any,
    opts: Partial<TRPCSubscriptionObserver<unknown, EdenClientError<AnyElysia>>> &
      EdenRequestOptions,
  ): Unsubscribable {
    const observable$ = this.$request({
      type: 'subscription',
      path,
      params,
      context: opts.context,
      signal: opts.signal,
    })

    return observable$.subscribe({
      next(envelope) {
        if (!('type' in envelope.result)) return

        switch (envelope.result.type) {
          case 'state': {
            opts.onConnectionStateChange?.(envelope.result)
            break
          }

          case 'started': {
            opts.onStarted?.({
              context: envelope.context,
            })
            break
          }

          case 'stopped': {
            opts.onStopped?.()
            break
          }

          case 'data':
          // falls through

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
  }
}
