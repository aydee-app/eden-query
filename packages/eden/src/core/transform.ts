import type { Get, Prettify } from '../utils/types'
import type {
  DefinedTypeConfig,
  InternalElysia,
  InternalTypeConfig,
  ResolveTypeConfig,
  TypeConfig,
} from './types'

/**
 * Data-transformers share the same interface, but have different semantics depending
 * on where they are executed during a request.
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/transformer.ts#L13
 */
export type DataTransformer = {
  /**
   * The unique ID of the transformer. Used to identify specific transformers
   * if multiple are used.
   */
  id?: string | number

  /**
   * Convert a raw value from the program into a JSON-serializable value.
   *
   * The raw JSON value needs to be a valid input into {@link JSON.stringify}.
   */
  serialize: (object: any) => any

  /**
   * Take a raw JSON value and convert it into the desired value to be used in the program.
   *
   * The raw JSON value can be anything returned from {@link JSON.parse}.
   */
  deserialize: (object: any) => any
}

/**
 * Serialize data from the client before it gets sent to the server in a request.
 * The server receives serialized data in the client request and deserializes it.
 * The server application interacts with the deserialized (original) client request data.
 *
 * @internal
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/transformer.ts#L18
 */
interface InputDataTransformer extends DataTransformer {
  /**
   * This function runs **on the client** before sending the data to the server.
   *
   * This should return a JSON-serializable value, e.g. a string.
   */
  serialize: (object: any) => any

  /**
   * This function runs **on the server** to transform the data before it is passed to the resolver
   */
  deserialize: (object: any) => any
}

/**
 * Serialize data from the server before it gets sent to the client in a response.
 * The client receives serialized data in the response and deserializes it.
 * The client application interacts with the deserialized (original) server response data.
 *
 * @internal
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/transformer.ts#L29
 */
interface OutputDataTransformer extends DataTransformer {
  /**
   * This function runs **on the server** before sending the data to the client.
   *
   * This should return a JSON-serializable value, e.g. a string.
   */
  serialize: (object: any) => any

  /**
   * This function runs **only on the client** to transform the data sent from the server.
   */
  deserialize: (object: any) => any
}

/**
 * A fully resolved data transformer specifies how data is transferred from the
 * client to the server and back to the client.
 *
 * @internal
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/server/src/unstable-core-do-not-import/transformer.ts#L43
 */
export interface ResolvedDataTransformer {
  /**
   * The unique ID of the transformer. Used to identify specific transformers
   * if multiple are used.
   */
  id?: string | number

  /**
   * Specify how the data sent from the client to the server should be transformed.
   */
  input: InputDataTransformer

  /**
   * Specify how the data sent from the server to the client should be transformed.
   */
  output: OutputDataTransformer
}

/**
 * Any valid data transformer.
 * All data transformers should be resolved to {@link ResolvedDataTransformer} internally.
 * A one-sided data transformer could be provided if input/output serialization and deserialization are symmetric.
 *
 * Data transformers can be used to transform the request body.
 *
 * @public
 */
export type AnyDataTransformer = ResolvedDataTransformer | DataTransformer

/**
 * Determine the type of transformer to require.
 *
 * If a single transformer was specified on the server, then the required transformer will be the same.
 * Otherwise, try to derive a union of values from `transformers` if provided.
 *
 * Multiple transformers can be provided as a mapping or an array, and the client can
 * use any of the transformers.
 *
 * @internal
 */
export type ResolveTransformer<T> = T extends ConfigWithTransformer
  ? {
      transformer: T['transformer']
    }
  : T extends ConfigWithTransformers
    ? T['transformers'] extends Array<infer TItem extends AnyDataTransformer>
      ? { transformer: TItem }
      : T['transformers'] extends Record<string, AnyDataTransformer>
        ? { transformer: T['transformers'][keyof T['transformers']] }
        : Partial<ConfigWithTransformer>
    : Partial<ConfigWithTransformer>

/**
 * If multiple transformers are specified on the server, then those same transformers
 * need to be specified on the frontend.
 *
 * Requests may have a "transformer ID' header attached, which allows the server
 * to resolve the specific transformer to use.
 *
 * If the server has multiple transformers specified and a request does not have a
 * "transformer ID" header, then it will apply the first one it finds.
 *
 * @internal
 */
export type ResolveTransformers<T> = T extends ConfigWithTransformers
  ? { transformers: T['transformers'] }
  : T extends ConfigWithTransformer
    ? { transformers?: [T['transformer']] }
    : Partial<ConfigWithTransformers>

/**
 * Multiple transformers can be specified via a "mapping".
 * If an array is provided, then each transformer will be identified by its index by default.
 * If an object is provided, then each transformer will be identified by its key by default.
 *
 * Transformers can have a unique ID specified directly, and that will have the highest priority.
 *
 * @internal
 */
export type TransformersMapping = Record<string, AnyDataTransformer> | Array<AnyDataTransformer>

/**
 * An object that contains a valid transformer.
 *
 * @internal
 */
export interface ConfigWithTransformer {
  transformer: AnyDataTransformer
}

/**
 * An
 * @internal
 */
export interface ConfigWithTransformers {
  transformers: TransformersMapping
}

/**
 * @internal
 */
export type ConfigWithAnyTransformer = ConfigWithTransformer | ConfigWithTransformers

/**
 * @internal
 */
export type TransformerUnrestrictedConfig = Partial<
  Prettify<ConfigWithTransformer & ConfigWithTransformers>
>

/**
 * This interface represents a possible subset of properties in the Elysia.js global state
 * within the eden store key.
 *
 * @internal
 *
 * @example
 *
 * A key is designated to store eden configuration within the Elysia.js server application instance.
 * If transformers are configured, then it will be nested under a `transform` key.
 *
 * In this example, the eden store key is "eden" and the transformer configuration is at
 * Elysia['store']['eden']['transform'].
 *
 * ```ts
 * // How this may occur during runtime, e.g. via an Elysia.js plugin.
 * const app = new Elysia().state({
 *   eden: {
 *     transform: {
 *       transformer: SuperJSON,
 *       transformers: [SuperJSON]
 *     }
 *   }
 * })
 *
 * // The resulting type.
 * type App = {
 *   store: {
 *     eden: {
 *       transform: {
 *         transformer: SuperJSON,
 *         transformers: [SuperJSON]
 *       }
 *     }
 *   }
 * }
 *
 * ```
 */
export interface StateWithTransformerConfig<T extends ConfigWithAnyTransformer> {
  transform: T
}

/**
 * Prevent `transformer` as a property if type-safety has been enabled and a transformer
 * was not found on the Elysia.js server application.
 *
 * @see https://github.com/trpc/trpc/blob/e543f3f3c86c9ad503a64d807ff4154ad6ec1637/packages/client/src/internals/transformer.ts#L24
 *
 * @internal
 */
export type TransformerProhibitedConfig = {
  /**
   * Data transformer
   *
   * You must use the same transformer on the backend and frontend
   * @see https://trpc.io/docs/v11/data-transformers
   **/
  transformer?: 'You must define a transformer on your your `initTRPC`-object first'
}

/**
 * A single transformer or multiple transformers were found on the server application.
 * Resolve additional transform options allowed for the request.
 *
 * @internal
 */
export type TransformerRequiredConfig<T extends ConfigWithAnyTransformer> = ResolveTransformer<T> &
  ResolveTransformers<T>

/**
 * If type-safety is enabled, resolve the additional transformer configurations strictly
 * based on the resolved configuration.
 *
 * @internal
 *
 * @template
 *   TTypeConfig A resolved type configuration.
 *   It should be a valid type configuration object.
 *   Based on the configuration, introspect the Elysia.js server application to determine appropriate options available.
 */
export type TransformerStrictConfig<
  TElysia extends InternalElysia = InternalElysia,
  TTypeConfig extends InternalTypeConfig = {},
  TStore = Get<TElysia['store'], [TTypeConfig['key']]>,
> =
  TStore extends StateWithTransformerConfig<infer TTransformerConfig>
    ? TransformerRequiredConfig<TTransformerConfig>
    : TransformerProhibitedConfig

/**
 * Resolve additional transformer options based on the type configuration.
 *
 * If type-safety is enabled, then strictly resolve possible values for transformer and transformers.
 * Otherwise, allow both to be provided optionally.
 *
 * @template
 *   TTypeConfig An unresolved type configuration.
 *   If it is `true` or an object, then it will be used to toggle stricter property checking.
 */
export type TransformerConfig<
  TElysia extends InternalElysia = InternalElysia,
  TTypeConfig extends TypeConfig = undefined,
> = TTypeConfig extends DefinedTypeConfig
  ? TransformerStrictConfig<TElysia, ResolveTypeConfig<TTypeConfig>>
  : TransformerUnrestrictedConfig
