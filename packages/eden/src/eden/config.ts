import type { EdenResolverConfig } from '../core/config'
import type { EdenRouteOptions } from '../core/infer'
import type { InternalElysia, InternalRouteSchema, InternalTypeConfig } from '../core/types'
import type { EdenLink } from '../links/types'
import type { ParamSeparator } from './path-param'

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
}

export type EdenConfig<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> = EdenResolverConfig<TElysia, TConfig> & {
  types?: TConfig
  links?: EdenLink<TElysia>[]
}

export type ExtendedEdenRouteOptions<
  TElysia extends InternalElysia,
  TRoute extends InternalRouteSchema,
  TConfig extends InternalEdenTypesConfig,
> = EdenRouteOptions<TRoute> & {
  eden?: EdenResolverConfig<TElysia, TConfig>
}
