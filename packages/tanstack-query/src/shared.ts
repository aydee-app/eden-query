import type { EdenConfig, InternalEdenTypesConfig, InternalElysia } from '@ap0nia/eden'
import type {
  DefaultError,
  MutationFunction,
  MutationKey,
  MutationOptions,
  QueryFunction,
  QueryKey,
  QueryOptions,
} from '@tanstack/query-core'

export interface EdenTanstackQueryConfig<
  TElysia extends InternalElysia,
  TConfig extends InternalEdenTypesConfig = {},
> extends EdenConfig<TElysia, TConfig> {
  /**
   * Whether to forward the signal from tanstack-query to the fetch request options.
   *
   * Same as tRPC's "abortOnUnmount" configuration.
   * @see https://trpc.io/docs/client/nextjs/setup#config-callback
   */
  abortOnUnmount?: boolean
}

export type EdenQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>
    queryKey: TQueryKey
  } & Pick<QueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'retry'>

export type EdenMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
  TContext = unknown,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    mutationFn: MutationFunction<TData, TVariables>
    mutationKey: MutationKey
  } & Pick<MutationOptions<TData, TError, TVariables, TContext>, 'retry'>
