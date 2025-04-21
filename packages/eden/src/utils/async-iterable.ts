/**
 * @see https://github.com/trpc/trpc/blob/8cef54eaf95d8abc8484fe1d454b6620eeb57f2f/packages/server/src/unstable-core-do-not-import/utils.ts#L52
 */
export function isAsyncIterable<TValue>(value: unknown): value is AsyncIterable<TValue> {
  if (typeof Symbol !== 'function' || !Symbol.asyncIterator) return false

  if (!value || typeof value !== 'object') return false

  return Symbol.asyncIterator in value
}

/**
 * Map over an async iterable.
 */
export async function* mapAsyncIterable<T>(generator: AsyncIterable<T>, map: (data: T) => any) {
  for await (const data of generator) {
    const mapped = await map(data)
    yield mapped
  }
}
