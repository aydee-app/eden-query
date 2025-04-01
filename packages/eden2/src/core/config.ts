/**
 * Regarding locations of type-safety implentation...
 *
 * Type-safety for transformers is implemented in {@link EdenResolverConfig} since transformers
 * are applied per request.
 *
 * Type-safety for batching is implemented in {@link _httpBatchLink} since batching is applied
 * via the specific link.
 */
import type { BatchMethod } from '../batch/shared'
import type { InternalContext, InternalElysia } from '../elysia'
import { httpBatchLink as _httpBatchLink } from '../links/http-batch-link'
import type { DataTransformerOptions } from '../trpc/server/transformer'
import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { FetchEsque } from './fetch'
import type { EdenRequestParams } from './request'
import type {
  EdenRequestHeaders,
  EdenRequestTransformer,
  EdenResponseTransformer,
  EdenResultTransformer,
} from './resolve'
import type { EdenClientTransformerOptions, TransformersOptions } from './transform'

/**
 * Global/general settings that influence the behavior of the resolver.
 *
 * @template TElysia The type definition of the Elysia.js server application.
 *
 * @template TKey A unique key to index the server application state to try to find a transformer configuration.
 *   Possible values:
 *   - falsy: disable type checking, and it is completely optional.
 *   - true: shorthand for "eden" or {@link EDEN_STATE_KEY}. Extract the config from {@link Elysia.store.eden}.
 *   - PropertyKey: any valid property key will be used to index {@link Elysia.store}.
 *
 *   Defaults to undefined, indicating to turn type-checking off.
 */
export type EdenResolverConfig<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
> = EdenClientTransformerOptions<TElysia, TKey> & {
  key?: TKey

  /**
   * Global query parameters for requests.
   */
  query?: Record<string, any>

  /**
   * Global fetch options that are merged with request-specific options before being
   * passed to {@link EdenResolverConfig.fetcher}.
   */
  fetch?: Omit<RequestInit, 'headers' | 'method'>

  /**
   * Ponyfill for fetch.
   *
   * Feature is available in both tRPC and eden (official).
   *
   * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L29
   * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L164
   */
  fetcher?: FetchEsque

  headers?: EdenRequestHeaders<TElysia, TKey>

  onRequest?: MaybeArray<EdenRequestTransformer<TElysia, TKey>>

  onResponse?: MaybeArray<EdenResponseTransformer<TElysia, TKey>>

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
 * Base configuration available to all eden plugins.
 */
export interface EdenPluginBaseConfig {
  /**
   * A custom key to store the configuration within Elysia.js state.
   *
   * @see https://elysiajs.com/essential/handler.html#state
   *
   * @default "eden"
   *
   * WARNING!!
   *
   * Be careful if using Symbols in conjunction with declaration or declarationMap on.
   * The type will be added to the server application directly, i.e. {@link AnyElysia.store}
   * and the resulting object may not be serializable.
   *
   * TS error code: 4118
   * @see https://www.typescriptlang.org/tsconfig/#declaration
   * @see https://www.typescriptlang.org/tsconfig/#declarationMap
   */
  key?: PropertyKey | Nullish | true
}

export interface TransformerPluginConfig extends EdenPluginBaseConfig {
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
 * On the client, multiple requests are grouped and serialized into a single batch of params.
 * A deserializer function will run on the server to parse out the individual requests.
 *
 * The client-side serializer function can be customized through the HTTP-batch-link (TODO).
 */
export type BatchDeserializer = (
  context: InternalContext,
  config: BatchPluginConfig,
) => MaybePromise<Array<EdenRequestParams>>

/**
 * Server application batch plugin configuration.
 */
export interface BatchPluginConfig extends EdenPluginBaseConfig {
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

/**
 * This configuration will be stored within {@link AnyElysia.store} and introspected by the client.
 *
 * Roughly correlates with tRPC RootConfig.
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/server/src/unstable-core-do-not-import/rootConfig.ts#L32
 */
export interface EdenPluginConfig {
  /**
   * Options for transforming JSON inputs and outputs.
   */
  transformer?: TransformerPluginConfig

  /**
   * Batching can be supported by using the batch plugin.
   * The batch plugin will populate this property; batching is assumed to be enabled if it is defined.
   */
  batch?: BatchPluginConfig
}
