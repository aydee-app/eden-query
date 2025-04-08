import { Elysia } from 'elysia'
import type { EdenResolverConfig } from '../core/config'
import type { InternalElysia, InternalRouteSchema, InternalTypeConfig } from '../core/types'

export interface InternalEdenTypesConfig extends InternalTypeConfig {
  separator?: string
}

export type EdenTypesConfig = InternalEdenTypesConfig | undefined | unknown

export type ResolveEdenTypeConfig<T> = T extends InternalEdenTypesConfig ? T : never

export type EdenTreatyProxy<
  TRoutes extends Record<string, any>,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
  TNormalRoutes extends Record<string, any> = Omit<TRoutes, Extract<keyof TRoutes, `:${string}`>>,
  TParamsRoutes extends Record<string, any> = Pick<TRoutes, Extract<keyof TRoutes, `:${string}`>>,
> = EdenTreatyNormalPathProxy<TNormalRoutes, TConfig, TPaths> &
  EdenTreatyParameterPathProxy<TParamsRoutes, TConfig, TPaths>

export type EdenTreatyNormalPathProxy<
  TRoutes extends Record<string, any>,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
> = {
  [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
    ? EdenTreatyRoute<TRoutes[K], TConfig, [...TPaths, K]>
    : EdenTreatyProxy<TRoutes[K], TConfig, [...TPaths, K]>
}

export type EdenTreatyParameterPathProxy<
  TRoutes extends Record<string, any>,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
  TResolvedConfig extends InternalEdenTypesConfig = ResolveEdenTypeConfig<TConfig>,
> = TResolvedConfig['separator'] extends string
  ? {
      [K in keyof TRoutes as K extends `:${infer Key}`
        ? StringReplace<TResolvedConfig['separator'], 'param', Key>
        : never]: TRoutes[K] extends InternalRouteSchema
        ? EdenTreatyRoute<TRoutes[K], TConfig, [...TPaths, K]>
        : EdenTreatyProxy<TRoutes[K], TConfig, [...TPaths, K]>
    }
  : {
      [K in keyof TRoutes]: TRoutes[K] extends InternalRouteSchema
        ? EdenTreatyRoute<TRoutes[K], TConfig, [...TPaths, K]>
        : EdenTreatyProxy<TRoutes[K], TConfig, [...TPaths, K]>
    }

export type StringReplace<
  T,
  TTarget extends string,
  TValue extends string,
> = T extends `${infer THead}${TTarget}${infer TTail}` ? `${THead}${TValue}${TTail}` : T

export type EdenTreatyRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
> = TPaths extends [...infer TPathSegments, infer TMethod]
  ? Uppercase<TMethod & string> extends 'GET'
    ? EdenTreatyQueryRoute<TRoute, TConfig, TPathSegments>
    : EdenTreatyMutationRoute<TRoute, TConfig, TPathSegments>
  : TPaths

export type EdenTreatyQueryRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
> = 'QUERY'

export type EdenTreatyMutationRoute<
  TRoute extends InternalRouteSchema,
  TConfig extends EdenTypesConfig = undefined,
  TPaths extends any[] = [],
> = 'MUTATION'

export type EdenTreaty<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends EdenTypesConfig = undefined,
> = EdenTreatyProxy<TElysia['_routes'], TConfig>

export type EdenConfig<
  TElysia extends InternalElysia = any,
  TConfig extends EdenTypesConfig = any,
> = EdenResolverConfig<TElysia, TConfig> & {
  types: TConfig
}

export function createEdenTreatyProxy(domain?: string, config?: EdenConfig, paths: string[] = []) {
  const proxy: any = new Proxy(() => {}, {
    get(target, p, receiver) {},
    apply(target, thisArg, argArray) {},
  })
  return proxy
}

export function edenTreaty<
  TElysia extends InternalElysia,
  TConfig extends EdenTypesConfig = undefined,
>(domain?: string, config?: EdenConfig<TElysia, TConfig>): EdenTreaty<TElysia, TConfig> {
  const proxy = createEdenTreatyProxy(domain, config)
  return proxy
}

export const app = new Elysia()
  .get('/posts/:id', () => true)
  .get('/posts/:postId', () => true)
  .get('/posts/all', () => true)
  .get('/a/b/c', () => 1)
  .post('/a/b/c', () => 'NO')

export const treaty = edenTreaty<typeof app, { separator: '{params}' }>(undefined, {
  types: {
    separator: '{params}',
  },
})

export type Test = Extract<keyof (typeof app)['_routes']['posts'], `:${string}`>
treaty.a.b.c.post
treaty.posts.all
treaty.posts['{ids}']
