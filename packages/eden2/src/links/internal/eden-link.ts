import type { InternalElysia } from '../../elysia'
import type { OperationLink } from './operation-link'

/**
 * The data that is used to initialize every link internally.
 *
 * Each link is a function that returns an initialization function that is invoked internally.
 * Since there is no data in the client runtime, it's basically just a thunk.
 */
export type EdenClientRuntime = {}

/**
 * @public
 */
export type EdenLink<T extends InternalElysia> = (opts: EdenClientRuntime) => OperationLink<T>
