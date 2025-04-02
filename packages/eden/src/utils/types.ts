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
