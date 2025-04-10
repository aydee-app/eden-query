import type { EdenWs, InternalEdenTypesConfig, InternalElysia } from '@ap0nia/eden'
import type {
  EdenMutationOptions,
  EdenQueryOptions,
  EdenTreatyTanstackQuery,
} from '@ap0nia/eden-tanstack-query'
import type {
  CreateMutationOptions,
  CreateMutationResult,
  CreateQueryOptions,
  CreateQueryResult,
} from '@tanstack/svelte-query'

/**
 * Core Eden-Treaty type-implementation.
 *
 * Iterate over every level in the route schema, separating the normal path segments
 * from the path parameter segments, and lower them separately.
 *
 * @internal
 */
export type EdenTreatySvelteQuery<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TTanstack = EdenTreatyTanstackQuery<TElysia, TRoutes, TConfig>,
> = {
  [K in keyof TTanstack]: EdenTreatySvelteQueryRoute<TElysia, TRoutes, TConfig, TTanstack[K]>
}

type EdenTreatySvelteQueryRoute<
  TElysia extends InternalElysia,
  TRoutes extends Record<string, unknown>,
  TConfig extends InternalEdenTypesConfig = {},
  TTanstackRoute = EdenTreatyTanstackQuery<TElysia, TRoutes, TConfig>,
> =
  // prettier-ignore
  // Function that returns strongly-typed query options.
  TTanstackRoute extends (
    ...args: infer Args
  ) => EdenQueryOptions<infer TQueryFnData, infer TError, infer TData, infer TQueryKey, infer _TPageParam>
  ? {
    createQuery: (
      ...args: [...Args, options?: CreateQueryOptions<TQueryFnData, TError, TData, TQueryKey>]
    ) => CreateQueryResult<TData, TError>
  }

  // prettier-ignore
  // Function that returns strongly-typed mutation options.
  : TTanstackRoute extends (
    ...args: infer Args
  ) => EdenMutationOptions<infer TData, infer TError, infer TVariables, infer _TContext>
  ? {
    createMutation: <TContext = unknown>(
      ...args: [...Args, options?: CreateMutationOptions<TData, TError, TVariables, TContext>]
    ) => CreateMutationResult<TData, TError, TVariables, TContext>
  }

  // prettier-ignore
  // Function that returns WebSocket client.
  : TTanstackRoute extends (...args: infer _Args) => EdenWs<infer _TRoute>
  ? TTanstackRoute

  // prettier-ignore
  // Path parameter function call that returns nested instance of proxy.
  : TTanstackRoute extends (...args: infer Args) => infer TNext
  ? (...args: Args) => EdenTreatySvelteQuery<TElysia, TRoutes, TConfig, TNext>

  // prettier-ignore
  // Regular path, lower without doing anything else.
  : EdenTreatySvelteQuery<TElysia, TRoutes, TConfig, TTanstackRoute>
