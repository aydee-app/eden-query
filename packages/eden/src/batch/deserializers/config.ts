import type { EdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import type { MaybeArray, MaybePromise } from '../../utils/types'
import type { BatchMethod } from '../shared'

export interface BatchDeserializerConfig {
  /**
   * The endpoint for batch requests.
   */
  endpoint?: string

  /**
   * The supported method(s) for batch requests.
   *
   * @default "POST".
   */
  method?: MaybeArray<BatchMethod | true>
}

/**
 * On the client, multiple requests are grouped and serialized into a single batch of params.
 * A deserializer function will run on the server to parse out the individual requests.
 *
 * The client-side serializer function can be customized through the HTTP-batch-link (TODO).
 */
export type BatchDeserializer<> = <
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(
  context: InternalContext,
  config: BatchDeserializerConfig,
) => MaybePromise<Array<EdenRequestOptions<TElysia, TConfig>>>
