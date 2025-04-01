import type {
  CombinedDataTransformer,
  DataTransformer,
  DataTransformerOptions,
} from '../trpc/server/transformer'
import { notNull } from '../utils/null'
import type { MaybeArray, TypeError } from '../utils/types'

/**
 * Provide a single transformer to use the same transformer on all requests.
 *
 * Provide an array of transformers with a unique ID for each in order to alternate between specific ones.
 * If a specifically requested transformer is not found, then default to the first transformer in the array.
 *
 * Provide a mapping of transformer IDs to transformers for a similar effect to the array.
 * Since transformers such as SuperJSON will not naturally have an ID, this is a simpler
 * alternative to assigning IDs to them without using spread syntax.
 */
export type TransformersOptions =
  | MaybeArray<DataTransformerOptions>
  | Record<string, DataTransformerOptions>

export interface ResolvedTransformer extends CombinedDataTransformer {
  /**
   * A reference to the original transformer object is required for a comparison.
   */
  original: DataTransformerOptions
}

export function resolveTransformer(
  transformer?: DataTransformerOptions,
): ResolvedTransformer | undefined {
  if (!transformer) return transformer

  if ('input' in transformer) {
    return { ...transformer, original: transformer }
  }

  return {
    id: transformer.id,
    input: transformer,
    output: transformer,
    original: transformer,
  }
}

export function resolveTransformers(options?: TransformersOptions): ResolvedTransformer[] {
  if (options == null) return []

  if (
    'input' in options &&
    'serialize' in options.input &&
    'output' in options &&
    'serialize' in options.output
  ) {
    const original = options as CombinedDataTransformer
    const id = options.id == null || typeof options.id === 'object' ? '0' : options.id
    return [{ id, ...original, original }]
  }

  if (
    'serialize' in options &&
    typeof options.serialize === 'function' &&
    'deserialize' in options &&
    typeof options.deserialize === 'function'
  ) {
    const id = options.id == null || typeof options.id === 'object' ? '0' : options.id

    const original = options as DataTransformer

    const transformer: CombinedDataTransformer = { id, input: original, output: original }

    return [{ ...transformer, original }]
  }

  const transformers = Object.entries(options)
    .map((entry) => {
      const transformer = resolveTransformer(entry[1])

      if (!transformer) return

      return { ...transformer, id: transformer.id || entry[0] }
    })
    .filter(notNull)

  return transformers
}

/**
 * Try to lookup a transformer from a collection of possible transformers.
 * The collection of transformers is the source of truth for transformer IDs.
 *
 * For instance, an array of possible transformers would map a numeric index to each transformer
 * as its ID. A record of transformers maps a key to each transformer.
 *
 * If none is found, then just resolve the transformer by itself.
 *
 * The objective is to match a random transformer with a known one specified in the collection.
 *
 * {@param transformers Raw transformers that be mapped with an ID.
 * {@param transformer} Raw transformer that may or may not have an ID.
 */
export function matchTransformer(
  transformers?: TransformersOptions,
  transformer?: DataTransformerOptions,
) {
  const resolvedTransformers = resolveTransformers(transformers)

  const resolvedTransformer = resolvedTransformers.find((t) => t.original === transformer)

  if (resolvedTransformer) return resolvedTransformer

  return resolveTransformer(transformer)
}

/**
 * Given a configuration, e.g. one that may look like {@link ConfigWithTransformer}, try
 * to infer the type of allowed transformers.
 *
 * - Object that maps IDs to transformers -> valid transformer is any value.
 * - Array of transformers -> valid transformer is any element.
 * - Single transformer specified -> valid transformer is the specified transformer.
 *
 *  This type does not perform output validation, i.e. that the output will conform to
 *  {@link DataTransformerOptions}.
 */
export type ResolveTransformerFromConfig<T = {}> = T extends {
  transformers: infer TransformerMapping extends Record<string, any>
}
  ? TransformerMapping extends any[]
    ? TransformerMapping[number]
    : TransformerMapping[keyof TransformerMapping]
  : T extends { transformer: infer IndividualTransformer }
    ? IndividualTransformer
    : DataTransformerOptions

/**
 * A client-side transformer is required because it was found on the server application.
 */
export interface EdenClientRequiredTransformer<T = {}> {
  transformer: ResolveTransformerFromConfig<T>
}

/**
 * A client-side transformer is prohibited until one is found on the server application.
 */
export interface EdenClientProhibitedTransformer {
  /**
   * Data transformer
   *
   * You must use the same transformer on the backend and frontend
   * @see https://trpc.io/docs/v11/data-transformers
   **/
  transformer?: TypeError<'You must define a transformer on your your `initTRPC`-object first'>
}

/**
 * A non-strict configuration for transformer.
 * It allows a transformer without explicitly prohibiting or requiring one.
 */
export interface EdenClientAllowedTransformer {
  /**
   * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/internals/transformer.ts#L37
   */
  transformer?: DataTransformerOptions
}

/**
 * If the server has either transformer or transformers defined, then assume that
 * transformers have been enabled.
 */
export type ConfigWithTransformer = { transformer: any } | { transformers: any }

/**
 * Once a configuration has been located, determine if a transformer should be required or prohibited.
 *
 * If a transformer is required, pass in the configuration and attempt to resolve the type of transformer
 * to provide.
 */
export type TransformerOptionsFromTransformerConfig<TConfig> = TConfig extends ConfigWithTransformer
  ? EdenClientRequiredTransformer<TConfig>
  : EdenClientProhibitedTransformer
