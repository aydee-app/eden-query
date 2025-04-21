import type {
  EdenConfig,
  GetOrHeadHttpMethod,
  InternalEdenTypesConfig,
  InternalElysia,
} from '@ap0nia/eden'
import type {
  DefaultError,
  MutationFunction,
  MutationKey,
  MutationOptions,
  QueryFunction,
  QueryKey,
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
  _TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = never,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>
    queryKey: TQueryKey
    error?: TError
  }

export type EdenMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
  TMutationKey = MutationKey,
> =
  // prettier-ignore At least one property with TError needs to be selected.
  {
    mutationFn: MutationFunction<TData, TVariables>
    mutationKey: TMutationKey
  } & Pick<MutationOptions<TData, TError, TVariables, TContext>, 'retry'>

export type AnyCapitalization<T extends string> = Capitalize<T> | Uncapitalize<T>

export type AnyCase<T extends string> = T | Lowercase<T> | Uppercase<T>

/**
 * lmao
 */
export type AnyCaseOrCapitalization<T extends string> =
  | AnyCapitalization<T>
  | AnyCase<T>
  | AnyCase<AnyCapitalization<T>>
  | AnyCapitalization<AnyCase<T>>

export type QueryMethod = AnyCaseOrCapitalization<GetOrHeadHttpMethod>
