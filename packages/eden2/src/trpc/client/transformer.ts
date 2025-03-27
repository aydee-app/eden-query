import type { TypeError } from '../../utils/types'
import type { CombinedDataTransformer, DataTransformerOptions } from '../server/transformer'

/**
 * Placeholder for tRPC.
 */
type AnyClientTypes = Record<string, any>

/**
 * @internal
 */
export type CoercedTransformerParameters = {
  transformer?: DataTransformerOptions
}

/**
 */
type TransformerOptionYes = {
  /**
   * Data transformer
   *
   * You must use the same transformer on the backend and frontend
   * @see https://trpc.io/docs/v11/data-transformers
   **/
  transformer: DataTransformerOptions
}

type TransformerOptionNo = {
  /**
   * Data transformer
   *
   * You must use the same transformer on the backend and frontend
   * @see https://trpc.io/docs/v11/data-transformers
   **/
  transformer?: TypeError<'You must define a transformer on your your `initTRPC`-object first'>
}

/**
 * @internal
 */
export type TransformerOptionsStrict<T extends Pick<AnyClientTypes, 'transformer'>> =
  T['transformer'] extends true ? TransformerOptionYes : TransformerOptionNo

/**
 * Unchecked transformer options.
 *
 * @internal
 */
export type TransformerOptions<T = any> = T extends any
  ? {
      transformer?: DataTransformerOptions
    }
  : {
      transformer?: DataTransformerOptions
    }

/**
 * @internal
 */
const defaultTransformer: CombinedDataTransformer = {
  input: {
    serialize: (data) => data,
    deserialize: (data) => data,
  },
  output: {
    serialize: (data) => data,
    deserialize: (data) => data,
  },
}

Object.freeze(defaultTransformer)
Object.freeze(defaultTransformer.input)
Object.freeze(defaultTransformer.output)

/**
 * @internal
 */
export function getTransformer(options?: TransformerOptions): CombinedDataTransformer {
  const transformer = options?.transformer

  if (!transformer) return defaultTransformer

  if ('input' in transformer) return transformer

  return { input: transformer, output: transformer }
}
