import type { EdenRequestOptions } from './core/config'
import type { EdenResult, EdenWebSocketState } from './core/dto'
import type { EdenClientError } from './core/error'
import type { InternalElysia } from './core/types'
import { createChain } from './links/shared'
import type {
  EdenClientRuntime,
  EdenLink,
  OperationContext,
  OperationLink,
  OperationLinkResult,
  OperationOptions,
} from './links/types'
import { promisifyObservable, share, type Unsubscribable } from './observable'
import type { inferAsyncIterableYield } from './utils/types'

/**
 * Options for Eden client operations.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L24
 */
export interface EdenClientRequestOptions {
  /**
   * Initial context for the operation.
   * Mutable context object is shared between {@link OperationLink}.
   * If none is provided, it will be initialized to an empty object.
   *
   * @default {}
   */
  context?: OperationContext

  /**
   * Signal to facilitate operation abortion.
   *
   * Note that this signal is distinct from the signal passed in {@link EdenRequestOptions.fetch}.
   * The latter will only cancel the request, but not necessarily the entire operation.
   * If either is passed, then they will be linked together.
   */
  signal?: AbortSignal
}

/**
 * WebSocketClient options.
 * Both WebSocket and HTTP links will simply initialize a new WebSocketClient for the subscription.
 *
 * WebSocket links only differ from HTTP links because they submit queries and mutations to a
 * WebSocket endpoint instead of an HTTP endpoint.
 *
 * When subscribing to an endpoint, callbacks for handling events from a subscription.
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L32
 */
export interface EdenSubscriptionObserver<TData, TError> {
  /**
   * Called with the operation result once the subscription has initially started.
   */
  onStarted: (operation: OperationLinkResult<TData, TError>) => void

  /**
   */
  onData: (data: TData) => void

  /**
   */
  onError: (error: TError) => void

  /**
   */
  onStopped: () => void

  /**
   */
  onComplete: () => void

  /**
   */
  onConnectionStateChange: (state: EdenWebSocketState<TError>) => void
}

/**
 * Options for initializing an {@link EdenClient}.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L42
 */
export interface EdenClientOptions<T extends InternalElysia> extends EdenClientRuntime<T> {
  /**
   * Must provide an array of links that describe the flow of data for requests.
   *
   * These links are uninitialized, and are called with {@link EdenClientRuntime} to be initialized.
   */
  links: EdenLink<T>[]
}

/**
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L118-L121
 * @internal
 */
export interface EdenClientSubscriptionOptions<TData = unknown>
  extends Partial<EdenSubscriptionObserver<TData, EdenClientError<InternalElysia>>>,
    EdenClientRequestOptions {}

/**
 * Elysia.js request client that provides the same "links" API as Apollo GraphQL and tRPC.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/TRPCUntypedClient.ts#L47
 *
 * This is only needed when configuring a treaty or fetch client with links.
 * Otherwise, the simpler "basic HTTP networking" strategy will be used.
 *
 * This client facilitates the same links API as tRPC.
 * @see https://trpc.io/docs/client/links
 *
 * Eden provides both the links API how Apollo GraphQL provides both the Apollo Link API and Basic HTTP networking.
 *
 * @see https://www.apollographql.com/docs/react/api/link/introduction
 * @see https://www.apollographql.com/docs/react/networking/basic-http-networking
 */
export class EdenClient<T extends InternalElysia = InternalElysia> {
  /**
   * Options used to initialize each link.
   */
  public readonly runtime: EdenClientRuntime<T>

  /**
   * Initialized links.
   */
  private readonly links: OperationLink<T>[]

  /**
   * A unique request ID following the JSON-RPC specification.
   *
   * @see https://www.jsonrpc.org/specification#request_object
   *
   * This is only really used by the WebSocket link, which uses the request ID to identify
   * outgoing responses from the server and incoming responses to the client.
   */
  private requestId: number

  constructor(options: EdenClientOptions<T>) {
    this.requestId = 0

    const { links, ...runtime } = options

    this.runtime = runtime

    this.links = links.map((link) => link(runtime))
  }

  private $request<TInput extends EdenRequestOptions = EdenRequestOptions, TOutput = unknown>(
    options: OperationOptions<TInput>,
  ) {
    const chain$ = createChain<T, TInput, TOutput>({
      links: this.links as OperationLink<T, any, TOutput>[],
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
    TInput extends EdenRequestOptions = EdenRequestOptions,
    TOutput = unknown,
  >(options: OperationOptions<TInput>): Promise<TOutput> {
    const req$ = this.$request<TInput, TOutput>(options)
    const promise = await promisifyObservable(req$)
    return promise.result as TOutput
  }

  public query<
    TInput extends EdenRequestOptions = EdenRequestOptions,
    TOutput extends EdenResult = EdenResult,
  >(path: string, params: TInput = {} as any, options?: EdenClientRequestOptions) {
    const promise = this.requestAsPromise<TInput, TOutput>({
      type: 'query',
      path,
      params,
      ...options,
    })
    return promise
  }

  public mutation<
    TInput extends EdenRequestOptions = EdenRequestOptions,
    TOutput extends EdenResult = EdenResult,
  >(path: string, params: TInput = {} as any, options?: EdenClientRequestOptions) {
    const promise = this.requestAsPromise<TInput, TOutput>({
      type: 'mutation',
      path,
      params,
      ...options,
    })

    return promise
  }

  /**
   * tRPC subscriptions are **not** equivalent with Eden/Elysia.js subscriptions.
   *
   * In tRPC, all requests are managed from a single endpoint. If the WebSocket adapter is used,
   * this means queries, mutations, subscriptions will all be handled by the same endpoint.
   * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/server/src/adapters/ws.ts#L108
   *
   * Whenever the client submits a request, a response is generated by invoking the corresponding procedure.
   * If the request was a query or mutation, then the WebSocket responds by sending one request.
   * If the request is a subscription, then the WebSocket iterates over the {@link AsyncIterable} and
   * sends a response for every item.
   *
   * The important thing to note is that **the server will resolve all request types**.
   *
   * When Elysia.js supports WebSockets, then you can connect to a specific endpoint directly.
   * For example `app.ws('/hello')` and `app.ws('/bye')` are distinct WebSocket endpoints.
   *
   * Eden offers a plugin, `edenWs`, that will handle queries and mutations sent to a particular
   * WebSocket endpoint, **but not subscriptions**.
   *
   * Subscriptions will need to be handled **by the client**.
   * i.e. The client needs to initialize an individual WebSocket connection to the endpoint.
   * This is because I do not know how to "forward" a subscription after the upgrade request has been received.
   */
  public subscription<
    TInput extends EdenRequestOptions = EdenRequestOptions,
    TOutput = unknown,
    TData = inferAsyncIterableYield<TOutput>,
  >(
    path: string,
    params: TInput = {} as any,
    options?: EdenClientSubscriptionOptions<TData>,
  ): Unsubscribable {
    const observable$ = this.$request<TInput, TData>({
      type: 'subscription',
      path,
      params,
      ...options,
    })

    const subscription = observable$.subscribe({
      next(envelope) {
        switch (envelope.result.type) {
          case 'state': {
            options?.onConnectionStateChange?.(envelope.result)
            break
          }

          case 'started': {
            options?.onStarted?.(envelope)
            break
          }

          case 'stopped': {
            options?.onStopped?.()
            break
          }

          case 'data': // falls through

          case undefined: {
            // After a query or mutation has been resolved,
            // the WebSocketClient should invoke the provided `error` callback if the response was an error.
            // Since TypeScript cannot see that here, we have to narrow the types.

            if (envelope.result.error) {
              options?.onError?.(envelope.result.error)
            } else {
              options?.onData?.(envelope.result.data)
            }

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

    return subscription
  }
}
