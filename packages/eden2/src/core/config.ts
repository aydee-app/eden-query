import type { BatchMethod } from '../batch/shared'
import type { EDEN_STATE_KEY } from '../constants'
import type { InternalContext, InternalElysia } from '../elysia'
import { httpBatchLink as _httpBatchLink } from '../links/http-batch-link'
import type { DataTransformerOptions } from '../trpc/server/transformer'
import type { MaybeArray, MaybePromise } from '../utils/types'
import type { FetchEsque } from './fetch'
import type { EdenRequestParams } from './request'
import type {
  EdenRequestHeaders,
  EdenRequestTransformer,
  EdenResponseTransformer,
  EdenResultTransformer,
} from './resolve'
import type {
  EdenClientAllowedTransformer,
  TransformerOptionsFromTransformerConfig,
  TransformersOptions,
} from './transform'

export type EdenTypeConfig = PropertyKey | undefined | boolean

/**
 * Shared configuration for eden entities that interface with Elysia.js.
 */
export interface EdenConfig<TKey extends EdenTypeConfig = undefined> {
  /**
   * Throughout the eden project, a "key" is provided as an opt-in mechanism to type-safety features.
   *
   * The key is used to access {@link InternalElysia.store} in order to introspect plugin configurations.
   * Eden plugins may write to the Elysia.js application state, and the resulting configurations
   * may be introspected by client-side plugins.
   *
   * @see https://elysiajs.com/essential/handler.html#state
   *
   * If a key is falsy, then it will be ignored and type-safety is **not** active.
   * If a key is `true`, then the default key, {@link _EDEN_STATE_KEY}, will be used.
   * If a key is a valid PropertyKey, then that key will be used.
   *
   * @default undefined Usually the key will be `undefined` and type-safety is **not** active.
   */
  key?: TKey
}

/**
 * Based on tRPC checking for transformer.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/internals/transformer.ts#L37
 *
 * Possible outputs:
 * - Allowed transformer: A generic {@link DataTransformerOptions} is allowed and optional.
 * - Required transformer: A specific type of transformer is required to be provided.
 * - Prohibited transformer: No transformer is allowed.
 */
export type EdenTransformerOptions<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
> = TKey extends false
  ? EdenClientAllowedTransformer
  : TKey extends keyof TElysia['store']
    ? TransformerOptionsFromTransformerConfig<TElysia['store'][TKey]>
    : TKey extends true
      ? TransformerOptionsFromTransformerConfig<TElysia['store'][typeof EDEN_STATE_KEY]>
      : EdenClientAllowedTransformer

/**
 * Configure the global behavior of the request resolver.
 */
export type EdenResolverConfig<
  TElysia extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = undefined,
> = EdenConfig<TKey> &
  EdenTransformerOptions<TElysia, TKey> & {
    /**
     * Global query parameters for requests.
     */
    query?: Record<string, any>

    /**
     * Global fetch options.
     */
    fetch?: Omit<RequestInit, keyof EdenResolverConfig>

    /**
     * Ponyfill for fetch.
     *
     * Feature is available in both tRPC and eden (official).
     *
     * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L29
     * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L164
     */
    fetcher?: FetchEsque

    /**
     * Global headers, provide a function to compute headers based on the request.
     */
    headers?: EdenRequestHeaders<TElysia, TKey>

    /**
     * Function(s) that can transform the request before it gets resolved.
     *
     * @default Eden provides a default that will apply transformers serializers with JSON or FormData bodies.
     */
    onRequest?: MaybeArray<EdenRequestTransformer<TElysia, TKey>>

    /**
     * Function(s) that can transform the response before processing the result.
     * Each function will be called in sequence, stopping at the first one that returns data or an error.
     * The returned data or error will be used as the result.
     *
     * @default Eden provides a default that will attempt to parse the data from the {@link Response}.
     */
    onResponse?: MaybeArray<EdenResponseTransformer<TElysia, TKey>>

    /**
     * Function(s) that can transform the result before the resolver resolves.
     *
     * @default Eden provides a default that will apply transformer deserializations to the response data.
     */
    onResult?: MaybeArray<EdenResultTransformer<TElysia, TKey>>

    /**
     * Whether to dynamically resolve the domain.
     *
     * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L477
     */
    keepDomain?: boolean

    /**
     * Either an origin or the Elysia.js application.
     */
    domain?: TElysia | string

    /**
     * If multiple transformers should be supported, they should be provided as either an array or object mapping.
     *
     * @todo
     * Add this property to {@link EdenClientAllowedTransformer} and {@link TransformerOptionsFromTransformerConfig}.
     * If type-checking is disabled, then it will be optional and the of the generic type {@link TransformersOptions}.
     * If type-checking is enabled, it will either be prohibited or required to be the same as the value found on the server.
     */
    transformers?: TransformersOptions

    /**
     * Passed as second argument to new URL if applicable.
     *
     * Basically {@link EdenRequestInit.domain} but always a string representing the "origin" of the request.
     *
     * @example
     *
     * ```ts
     * const base = 'http://e.ly'
     * const path = '/posts/123'
     *
     * const url = new URL(path, base)
     * ```
     */
    base?: string

    /**
     * Default HTTP method for the request.
     *
     * Based on `methodOverride` from tRPC.
     *
     * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L35
     */
    method?: string
  }

/**
 * On the client, multiple requests are grouped and serialized into a single batch of params.
 * A deserializer function will run on the server to parse out the individual requests.
 *
 * The client-side serializer function can be customized through the HTTP-batch-link (TODO).
 */
export type BatchDeserializer = <
  TElysia extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = any,
>(
  context: InternalContext,
  config: BatchPluginConfig<TElysia, TKey>,
) => MaybePromise<Array<EdenRequestParams<TElysia, TKey>>>

/**
 */
export interface TransformerPluginConfig<
  _TElysia extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = any,
> extends EdenConfig<TKey> {
  /**
   * Use the same transformer for all requests.
   */
  transformer?: DataTransformerOptions

  /**
   * If multiple transformers desired, provide an array or object mapping of transformers.
   */
  transformers?: TransformersOptions
}

/**
 */
export interface BatchPluginConfig<
  _TElysia extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = any,
> extends EdenConfig<TKey> {
  /**
   * The endpoint for batch requests.
   */
  endpoint?: string

  /**
   * The supported method(s) for batch requests.
   *
   * @default "POST".
   */
  method?: MaybeArray<BatchMethod>

  /**
   * A custom deserializer for batch requests.
   *
   * When a batch request is made, multiple requests are "serialized" into a single request.
   * On the server, each individual request needs to be parsed from the bundle.
   */
  deserializer?: BatchDeserializer
}
