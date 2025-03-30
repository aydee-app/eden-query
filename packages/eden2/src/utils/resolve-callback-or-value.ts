/**
 * A value that can be wrapped in callback
 */
export type CallbackOrValue<T, TArgs extends any[] = []> =
  | T
  | ((...args: TArgs) => T | PromiseLike<T>)

export function resolveCallbackOrValue<T, TArgs extends any[] = []>(
  callbackOrValue: CallbackOrValue<T, TArgs>,
  ...args: TArgs
): T | PromiseLike<T> {
  return typeof callbackOrValue === 'function'
    ? (callbackOrValue as (...args: TArgs) => T)(...args)
    : callbackOrValue
}
