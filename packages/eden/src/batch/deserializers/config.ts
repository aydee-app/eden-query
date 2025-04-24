import type { HTTPMethod } from '../../constants'
import type { InternalEdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import type { MaybeArray, MaybePromise } from '../../utils/types'

/**
 * Configuration options for a batch request deserializer.
 */
export interface BatchDeserializerConfig {
  /**
   * The endpoint for batch requests.
   */
  endpoint?: string

  /**
   * The supported method(s) for batch requests or `true` to handle all HTTP methods.
   *
   * @default true.
   */
  method?: MaybeArray<HTTPMethod | true | (string & {})>

  /**
   * Headers to apply to all batched requests.
   *
   * This is used in testing to distinguish batched requests from their encapsulating batch request.
   */
  headers?: HeadersInit
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
) => MaybePromise<Array<InternalEdenRequestOptions<TElysia, TConfig>>>
