import type { EdenRequestParams } from './core/config'
import type { EdenResult, EdenWsStateResult } from './core/dto'
import type { EdenError } from './core/error'
import type { InternalElysia } from './core/types'
import { createChain } from './links/shared'
import type {
  EdenClientRuntime,
  EdenLink,
  OperationContext,
  OperationLink,
  OperationOptions,
} from './links/types'
import { promisifyObservable, share, type Unsubscribable } from './observable'
import type { inferAsyncIterableYield } from './utils/types'

export interface EdenSubscriptionObserver<TValue, TError> {
  onStarted: (opts: { context: OperationContext | undefined }) => void

  onData: (value: inferAsyncIterableYield<TValue>) => void

  onError: (err: TError) => void

  onStopped: () => void

  onComplete: () => void

  onConnectionStateChange: (state: EdenWsStateResult<TError>) => void
}

/**
 */
export interface EdenCreateClientOptions<T extends InternalElysia> {
  links: EdenLink<T>[]
  transformer?: 'The transformer property has moved to httpLink/httpBatchLink/wsLink'
}

/**
 * @internal
 */
export interface EdenClientSubscriptionOptions
  extends Partial<EdenSubscriptionObserver<unknown, EdenError<InternalElysia>>>,
    EdenRequestOptions {}

export interface EdenRequestOptions {
  context?: OperationContext
  signal?: AbortSignal
}

export class EdenClient<T extends InternalElysia> {
  private readonly links: OperationLink<T>[]

  public readonly runtime: EdenClientRuntime

  private requestId: number

  constructor(opts: EdenCreateClientOptions<T>) {
    this.requestId = 0

    this.runtime = {}

    this.links = opts.links.map((link) => link(this.runtime))
  }

  private $request<TInput extends EdenRequestParams = any, TOutput = unknown>(
    options: OperationOptions<TInput>,
  ) {
    const chain$ = createChain<InternalElysia, TInput, TOutput>({
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

  private async requestAsPromise<
    TInput extends EdenRequestParams = EdenRequestParams,
    TOutput = unknown,
  >(options: OperationOptions<TInput>): Promise<TOutput> {
    const req$ = this.$request<TInput, TOutput>(options)
    const promise = await promisifyObservable(req$)
    return promise.result as TOutput
  }

  public query<
    TInput extends EdenRequestParams = EdenRequestParams,
    TOutput extends EdenResult = EdenResult,
  >(path: string, params: TInput = {} as any, options?: EdenRequestOptions) {
    const promise = this.requestAsPromise<TInput, TOutput>({
      type: 'query',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })
    return promise
  }

  public mutation<
    TInput extends EdenRequestParams = EdenRequestParams,
    TOutput extends EdenResult = EdenResult,
  >(path: string, params: TInput = {} as any, options?: EdenRequestOptions) {
    const promise = this.requestAsPromise<TInput, TOutput>({
      type: 'mutation',
      path,
      params,
      context: options?.context,
      signal: options?.signal,
    })

    return promise
  }

  public subscription<TInput extends EdenRequestParams = EdenRequestParams, TOutput = unknown>(
    path: string,
    params: TInput = {} as any,
    options?: EdenClientSubscriptionOptions,
  ): Unsubscribable {
    const observable$ = this.$request<TInput, TOutput>({
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
