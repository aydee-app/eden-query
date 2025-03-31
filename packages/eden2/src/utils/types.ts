export type Nullish = null | undefined | void

export type Falsy = Nullish | false

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsNever<T> = [T] extends [never] ? true : false

export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false

export type Not<T> = T extends true ? false : true

export type MaybeArray<T> = T | Array<T>

export type MaybePromise<T> = T | PromiseLike<T>

/**
 * Types that can be used in a string template.
 */
export type Stringable = string | number | boolean | bigint | Nullish

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false

export type ReplaceGeneratorWithAsyncGenerator<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Generator<infer A, infer B, infer C>
    ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
      ? AsyncGenerator<A, B, C>
      : And<IsNever<A>, void extends B ? false : true> extends true
        ? B
        : AsyncGenerator<A, B, C> | B
    : T[K] extends AsyncGenerator<infer A, infer B, infer C>
      ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
        ? AsyncGenerator<A, B, C>
        : And<IsNever<A>, void extends B ? false : true> extends true
          ? B
          : AsyncGenerator<A, B, C> | B
      : T[K]
} & {}

export type NonEmptyArray<T> = [T, ...T[]]

export type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type Files = File | FileList

export type ReplaceBlobWithFiles<T> = {
  [K in keyof T]: T[K] extends Blob | Blob[] ? Files : T[K]
} & {}

/**
 * @see https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/server/src/unstable-core-do-not-import/types.ts#L170C1-L170C31
 */
const _errorSymbol = Symbol()

/**
 * @se https://github.com/trpc/trpc/blob/0abf82448043f49c09dcdbb557b5a2b5344faf18/packages/server/src/unstable-core-do-not-import/types.ts#L172
 */
export type TypeError<TMessage extends string> = TMessage & {
  _: typeof _errorSymbol
}

/**
 * @internal
 * Infers the type of the value yielded by an async iterable
 */
export type inferAsyncIterableYield<T> = T extends AsyncIterable<infer U> ? U : T
