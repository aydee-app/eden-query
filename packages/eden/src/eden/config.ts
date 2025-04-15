import type { EdenClient } from '../client'
import type { EdenResolverConfig } from '../core/config'
import type { EdenRouteInput } from '../core/infer'
import type { InternalElysia, InternalRouteSchema, InternalTypeConfig } from '../core/types'
import type { EdenLink } from '../links/types'
import type { WebSocketClientOptions } from '../ws/client'
import type { ParamSeparator } from './path-param'
import type { EdenWs } from './ws'

export type ResolveEdenTypeConfig<T> = T extends InternalEdenTypesConfig ? T : never

/**
 * Define how types are presented in the proxy.
 */
export interface InternalEdenTypesConfig extends InternalTypeConfig {
  /**
   * By default, this undefined and parameters will be passed via function call.
   * If this is defined, then a string path will be used and `params` will be passed in at the end.
   *
   * @example
   *
   * Original route = '/posts/:postId/users/:userId'
   *
   * Default separator = treaty.posts({ postId: 'my-post-id' }).users({ userId: 'my-user-id' }).get()
   *
   * Custom separator, $param = treaty.posts.$postId.users.$userId.get({ params: { postId: 'my-post-id', userId: 'my-user-id' } })
   */
  separator?: ParamSeparator

  omit?: string

  pick?: string
}

export type EdenConfig<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenResolverConfig<TElysia, TConfig> & {
  types?: TConfig
  links?: EdenLink<TElysia>[]
}

export type ExtendedEdenRouteOptions<
  TElysia extends InternalElysia = InternalElysia,
  TRoute extends InternalRouteSchema = InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig = InternalEdenTypesConfig,
> = EdenRouteInput<TRoute> & {
  eden?: EdenResolverConfig<TElysia, TConfig>
}

/**
 * Similar to tRPC, all of the possible operations are calculated and cached
 * outside of the proxy implementation. These operations are called "root hooks".
 *
 * @see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/react-query/src/shared/hooks/createHooksInternal.tsx#L81
 */
export interface EdenHooks {
  query: EdenClient['query']
  mutation: EdenClient['mutation']
  subscription: (options: WebSocketClientOptions) => EdenWs
}
