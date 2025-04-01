import { EDEN_STATE_KEY as _EDEN_STATE_KEY } from './constants'

/**
 * Internally maintained interface representing an Elysia instance.
 */
export interface InternalElysia {
  store?: any
  handle?: (request: Request) => Promise<Response>
}

export interface InternalContext {
  request: Request
}

export interface InternalRouteSchema {
  body?: unknown
  headers?: unknown
  query?: unknown
  params?: unknown
  cookie?: unknown
  response?: unknown
}

/**
 * Throughout the eden project, a "key" is provided as an opt-in mechanism to type-safety features.
 *
 * The key is used to access {@link InternalElysia.store} in order to introspect plugin configurations.
 * Eden plugins may write to the Elysia.js application state, and the resulting configurations
 * may be introspected by client-side plugins.
 *
 * @see https://elysiajs.com/essential/handler.html#state
 *
 * If a key is `false`, then it will be ignored and type-safety is **not** active.
 * If a key is `true`, then the default key, {@link _EDEN_STATE_KEY}, will be used.
 * If a key is a valid PropertyKey, then that key will be used.
 *
 * @default undefined Usually the key will be `undefined` and type-safety is **not** active.
 */
export type StoreKey = PropertyKey | boolean
