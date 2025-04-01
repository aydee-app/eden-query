import type { EdenClientError } from './core/errors'
import type { EdenRequestParams } from './core/request'
import type { EdenResult } from './core/response'
import type { InternalElysia } from './elysia'
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
export interface EdenCreateClientOptions<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
> {
  links: EdenLink<TElysia, TKey>[]
  transformer?: TypeError<'The transformer property has moved to httpLink/httpBatchLink/wsLink'>
}

/**
 * @internal
 */
export interface EdenClientSubscriptionOptions
  extends Partial<EdenSubscriptionObserver<unknown, EdenClientError<InternalElysia>>>,
    EdenRequestOptions {}

export interface EdenRequestOptions {
  context?: OperationContext
  signal?: AbortSignal
}

export class EdenClient<TElysia extends InternalElysia = InternalElysia, TKey = undefined> {
  private readonly links: OperationLink<TElysia, TKey>[]

  public readonly runtime: EdenClientRuntime

  private requestId: number

  constructor(opts: EdenCreateClientOptions<TElysia, TKey>) {
    this.requestId = 0

    this.runtime = {}

    this.links = opts.links.map((link) => link(this.runtime))
  }

  private $request(options: OperationOptions<TElysia, TKey>) {
    const chain$ = createChain({
      links: this.links,
      op: {
        ...options,
        context: options.context ?? {},
        id: ++this.requestId,
      },
    })
    const observable = chain$.pipe(share())
    return observable
  }

  private async requestAsPromise<TOutput = unknown>(
    options: OperationOptions<TElysia, TKey>,
  ): Promise<TOutput> {
    const req$ = this.$request(options)
    const promise = await promisifyObservable(req$)
    return promise.result as any
  }

  public query<TOutput extends EdenResult = EdenResult>(
    path: string,
    params: EdenRequestParams<TElysia, TKey> = {} as any,
    options?: EdenRequestOptions,
  ) {
    const promise = this.requestAsPromise<TOutput>({
      type: 'query',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })
    return promise
  }

  public mutation<TOutput extends EdenResult = EdenResult>(
    path: string,
    params: EdenRequestParams<TElysia, TKey> = {} as any,
    options?: EdenRequestOptions,
  ) {
    const promise = this.requestAsPromise<TOutput>({
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
    params: EdenRequestParams<TElysia, TKey> = {} as any,
    options?: EdenClientSubscriptionOptions,
  ): Unsubscribable {
    const observable$ = this.$request({
      type: 'subscription',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })

    const unsubscribable = observable$.subscribe({
      next(envelope) {
        switch (envelope.result.type) {
          case 'state': {
            options?.onConnectionStateChange?.(envelope.result)
            break
          }

          case 'started': {
            options?.onStarted?.({ context: envelope.context })
            break
          }

          case 'stopped': {
            options?.onStopped?.()
            break
          }

          case 'data': // falls through

          case undefined: {
            options?.onData?.(envelope.result.data)
            break
          }
        }
      },
      error(err) {
        options?.onError?.(err)
      },
      complete() {
        options?.onComplete?.()
      },
    })

    return unsubscribable
  }
}
