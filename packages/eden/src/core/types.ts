import type { EDEN_STATE_KEY } from '../constants'

/**
 * In order to reduce the possibility of breaking with upstream changes,
 * the types are extremely loose, but their general shape is documented via comments.
 */
export interface InternalElysia {
  /**
   * This property is updated with calls to state.
   */
  store?: any // Record<string, any>

  /**
   * Type information. Needed for inferring custom error declarations.
   *
   * @see https://elysiajs.com/essential/life-cycle.html#custom-error
   */
  _types?: any // InternalTypes

  /**
   * All registered routes.
   */
  _routes?: any // InternalRoutes

  /**
   * WinterCG, web-standard compliant request handler.
   * @see https://elysiajs.com/patterns/mount.html#mount-1
   */
  handle?: (request: Request) => Promise<Response>
}

export type InternalRoutes = {
  [K: string]: InternalRouteSchema | InternalRoutes
}

export interface InternalTypes {
  Definitions?: InternalDefinitions
}

export interface InternalDefinitions {
  error?: Record<string, Error>
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

export interface InternalTypeConfig {
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
  key?: PropertyKey | true
}

/**
 * If `true` is provided as a type configuration, then the default configuation is applied.
 */
export interface DefaultTypeConfig {
  key: typeof EDEN_STATE_KEY
}

export type DefinedTypeConfig = InternalTypeConfig | true

export type TypeConfig = DefinedTypeConfig | undefined | unknown

/**
 */
export type ResolveTypeConfig<T> = T extends InternalTypeConfig
  ? T
  : T extends true
    ? DefaultTypeConfig
    : never
