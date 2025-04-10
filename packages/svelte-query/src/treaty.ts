import type { EdenWs, InternalEdenTypesConfig, InternalElysia } from '@ap0nia/eden'
import type { EdenTreatyTanstackQuery } from '@ap0nia/eden-tanstack-query'
import type {
  MutateOptions,
  MutationOptions,
  Override,
  QueryOptions,
  WithRequired,
} from '@tanstack/query-core'
import type { CreateBaseMutationResult, CreateQueryResult } from '@tanstack/svelte-query'
import Elysia from 'elysia'
import type { Readable } from 'svelte/store'

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
  [K in keyof TTanstack]: TTanstack[K] extends (
    ...args: infer Args
  ) => WithRequired<
    QueryOptions<
      infer _TQueryFnData,
      infer TError,
      infer TData,
      infer _TQueryKey,
      infer _TPageParam
    >,
    'queryFn' | 'queryKey'
  >
    ? {
        createQuery: (...args: Args) => CreateQueryResult<TData, TError>
      }
    : TTanstack[K] extends (
          ...args: infer Args
        ) => WithRequired<
          MutationOptions<
            infer TData,
            infer TError,
            infer TVariables extends any[],
            infer _TContext
          >,
          'mutationFn' | 'mutationKey'
        >
      ? {
          createMutation: <TContext = unknown>(
            ...args: Args
          ) => Readable<
            Override<
              CreateBaseMutationResult<TData, TError, TVariables, TContext>,
              {
                mutate: (
                  ...args: [
                    ...TVariables,
                    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>,
                  ]
                ) => void

                mutateAsync: (
                  ...args: [
                    ...TVariables,
                    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>,
                  ]
                ) => Promise<TData>
              }
            >
          >
        }
      : TTanstack[K] extends (...args: infer _Args) => EdenWs<infer _TRoute>
        ? TTanstack[K]
        : TTanstack[K] extends (...args: infer Args) => infer TNext
          ? (...args: Args) => EdenTreatySvelteQuery<TElysia, TRoutes, TConfig, TNext>
          : EdenTreatySvelteQuery<TElysia, TRoutes, TConfig, TTanstack[K]>
}

const app = new Elysia()
  .get('/hello/world', () => false)
  .get('/posts/:id', () => 123)
  .patch('/posts/:id', () => true)
  .ws('/ws', {})

type App = typeof app

export const tt: EdenTreatyTanstackQuery<App, App['_routes']> = {} as any

export const hello = tt.posts({ id: '' }).patch()

export const treaty: EdenTreatySvelteQuery<App, App['_routes']> = {} as any

export const hm = treaty
  .posts({ id: '' })
  .patch.createMutation()
  .subscribe((p) => p.mutateAsync({}, {}, {}))

export type huhhh = typeof hm
