import type {
  CombinedDataTransformer,
  DataTransformer,
  DataTransformerOptions,
} from '../trpc/server/transformer'
import { notNull } from '../utils/null'
import type { TransformersOptions } from './config'

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
