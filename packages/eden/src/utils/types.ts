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

export type ReplaceBlobWithFiles<T> = {
  [K in keyof T]: T[K] extends Blob[] ? File[] : T[K] extends Blob ? File : T[K]
}

export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false

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
