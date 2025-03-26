import type { AnyElysia } from 'elysia'

import type { DefaultErrorShape } from './errors'

/**
 * The initial generics that are used in the init function
 * @internal
 */
export interface RootTypes {
  ctx: object
  meta: object
  errorShape: DefaultErrorShape
  transformer: boolean
}

/**
 * @internal
 */
export type CreateRootTypes<TGenerics extends RootTypes> = TGenerics

export type AnyRootTypes = CreateRootTypes<{
  ctx: any
  meta: any
  errorShape: any
  transformer: any
}>

export type AnyClientTypes = Pick<AnyRootTypes, 'errorShape' | 'transformer'>

/**
 * Result of `initTRPC.create()`
 */
type InitLike = {
  _config: {
    $types: AnyClientTypes
  }
}

/**
 * Result of `initTRPC.create().router()`
 */
type RouterLike = {
  _def: InitLike
}

/**
 * Result of `initTRPC.create()._config`
 */
type RootConfigLike = {
  $types: AnyClientTypes
}

/**
 * Anything that can be inferred to the root config types needed for a TRPC client
 *
 * @remarks Add {@link AnyElysia} to the possible client types for cross-compatibility.
 */
export type InferrableClientTypes =
  | AnyElysia
  | RouterLike
  | InitLike
  | RootConfigLike
  | AnyClientTypes

type PickTypes<T extends AnyClientTypes> = {
  transformer: T['transformer']
  errorShape: T['errorShape']
}

/**
 * Infer the root types from a InferrableClientTypes
 */
export type inferClientTypes<TInferrable extends InferrableClientTypes> =
  TInferrable extends AnyClientTypes
    ? PickTypes<TInferrable>
    : TInferrable extends RootConfigLike
      ? PickTypes<TInferrable['$types']>
      : TInferrable extends InitLike
        ? PickTypes<TInferrable['_config']['$types']>
        : TInferrable extends RouterLike
          ? PickTypes<TInferrable['_def']['_config']['$types']>
          : never

export type inferErrorShape<TInferrable extends InferrableClientTypes> =
  inferClientTypes<TInferrable>['errorShape']
