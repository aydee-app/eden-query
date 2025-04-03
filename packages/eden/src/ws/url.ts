import type { CallbackOrValue } from '../utils/callback-or-value'

export interface WebSocketUrlOptions {
  /**
   * The URL to connect to (can be a function that returns a URL)
   */
  url: CallbackOrValue<string>

  /**
   * Connection params that are available in `createContext()`
   * - For `wsLink`/`wsClient`, these are sent as the first message
   * - For `httpSubscriptionLink`, these are serialized as part of the URL under the `connectionParams` query
   */
  connectionParams?: CallbackOrValue<Dict<string> | null>
}
