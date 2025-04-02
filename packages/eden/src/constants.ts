/**
 * The default key that's used to store eden-related configuration within the
 * Elysia.js server application.
 *
 * @example
 *
 * ```ts
 * const edenPlugin = new Elysia().state(EDEN_STATE_KEY, {
 *   transformer: { ... },
 *   batch: true,
 * })
 * ```
 */
export const EDEN_STATE_KEY = 'eden' as const
