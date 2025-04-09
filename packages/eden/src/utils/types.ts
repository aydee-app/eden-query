/**
 * Access an object with an array of keys.
 * Recur into {@link T} by applying each key in {@link TKeys} sequentially.
 * If a key is invalid at any point, return {@link TDefault}.
 */
export type Get<T, TKeys extends any[] = [], TDefault = Record<string, unknown>> = TKeys extends [
  infer Head,
  ...infer Tail,
]
  ? Head extends keyof T
    ? Get<T[Head], Tail>
    : TDefault
  : T

export type Prettify<T> = { [K in keyof T]: T[K] }

export type Nullish = null | undefined | void

export type IsNever<T> = [T] extends [never] ? true : false

export type Not<T> = T extends true ? false : true

export type MaybeArray<T> = T | Array<T>

export type MaybePromise<T> = T | PromiseLike<T>

export type ReplaceBlobWithFiles<T> = {
  [K in keyof T]: T[K] extends Blob[] ? File[] : T[K] extends Blob ? File : T[K]
}

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false

/**
 * Elysia.js handlers can sometimes be generators, this utility normalizes their output types.
 */
export type NormalizeGenerator<T> =
  T extends Generator<infer A, infer B, infer C>
    ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
      ? AsyncGenerator<A, B, C>
      : And<IsNever<A>, void extends B ? false : true> extends true
        ? B
        : AsyncGenerator<A, B, C> | B
    : T extends AsyncGenerator<infer A, infer B, infer C>
      ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
        ? AsyncGenerator<A, B, C>
        : And<IsNever<A>, void extends B ? false : true> extends true
          ? B
          : AsyncGenerator<A, B, C> | B
      : T

/**
 * @internal
 */
export type Enumerate<
  T extends number,
  Accumulated extends number[] = [],
> = Accumulated['length'] extends T
  ? Accumulated[number]
  : Enumerate<T, [...Accumulated, Accumulated['length']]>

/**
 * By enumerating all the numbers up to {@link To}, and then excluding everything in {@link From},
 * a range starting at {@link From} (exclusive) and ending before {@link To} (exclusive) is formed.
 *
 * @see https://stackoverflow.com/a/39495173
 *
 * This can be used for creating ranges of well known HTTP status codes for instance.
 * @internal
 */
export type Range<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>

/**
 * @internal
 * Infers the type of the value yielded by an async iterable
 */
export type inferAsyncIterableYield<T> = T extends AsyncIterable<infer U> ? U : T

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

export type StringReplace<
  T,
  TTarget extends string,
  TValue extends string,
> = T extends `${infer THead}${TTarget}${infer TTail}` ? `${THead}${TValue}${TTail}` : T

export type ExtractString<T, U extends string> = T extends `${U}${infer Inner}` ? Inner : T & string

export type ValueOf<T> = T[keyof T]

export type KeyFromValue<TValue, TType extends Record<PropertyKey, PropertyKey>> = {
  [K in keyof TType]: TValue extends TType[K] ? K : never
}[keyof TType]

export type InvertKeyValue<T extends Record<PropertyKey, PropertyKey>> = {
  [TValue in T[keyof T]]: KeyFromValue<TValue, T>
}
