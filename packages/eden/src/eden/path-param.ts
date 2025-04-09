import { toArray } from '../utils/array'
import type { ExtractString, MaybeArray, StringReplace } from '../utils/types'

export const paramKey = 'param' as const

export const defaultParamKey = `:${paramKey}` as const

export type ParamKey = typeof paramKey

export type ParamSeparator = `${string}${ParamKey}${string}`

/**
 * Elysia.js always names route params in the format, ":param".
 * Faciliate custom string templates by replacing this default format.
 */
export type FormatParam<T, U> = StringReplace<U, ParamKey, ExtractString<T, ':'>>

/**
 * Given a route schema like
 * type Schema = {
 *   posts: {
 *     :id: { ... },
 *     :postId: { ... }
 *   }
 * }
 *
 * If currently at "posts", then convert to a union of possible objects.
 *
 * e.g. ParameterFunctionArgs<Schema['posts'> = { id: string | number } | { postId: string | number }
 */
export type ParameterFunctionArgs<T> = {
  [K in keyof T]: {
    [Key in ExtractString<K, ':'>]: string | number
  }
}[keyof T]

/**
 *
 * An eden-treaty proxy may look like these examples:
 *
 * eden.api.products.get({ limit: 5 })
 * eden.api.product({ id: 'product-id' }).details.get({ limit: 5 })
 *
 * In the first example, the proxy is called like a function at the very end, so it is trivial
 * to infer that the arguments are the query parameters for fetch request.
 *
 * In the second example, there are two function calls, and we need to heuristically determine whether
 * it is a function call to insert a path parameter, or the actual end.
 *
 * Heuristic: A path parameter function call needs exactly one object with exactly one key passed as an argument.
 */
export function getPathParam(args: unknown[]) {
  if (args.length !== 1) return

  const argument = args[0]

  if (argument == null || typeof argument !== 'object') return

  const argumentKeys = Object.keys(argument)

  const pathParam = argumentKeys[0]

  if (argumentKeys.length !== 1 || pathParam == null) return

  return { param: argument as any, key: argumentKeys[0] }
}

export function replacePathParams(
  path: string,
  params: MaybeArray<Record<string, any>> = {},
  separator: ParamSeparator = defaultParamKey,
) {
  const paramsArray = toArray(params)

  /**
   * @example [ { id: 'my-id' }, { userId: 'my-user-id' } ]
   */
  const allParams = paramsArray.flatMap((param) => Object.entries(param))

  const resolvedPath = allParams.reduce((current, [key, value]) => {
    /**
     * @example '{id}', '$id', ':id'
     */
    const target = separator.replace(paramKey, key)

    return current.replace(target, value)
  }, path)

  return resolvedPath
}

export function replacePathParamSeparators(
  path: string,
  params: string[] = [],
  fromSeparator: ParamSeparator = defaultParamKey,
  toSeparator: ParamSeparator = defaultParamKey,
) {
  const resolvedPath = params.reduce((current, param) => {
    const from = fromSeparator.replace(paramKey, param)
    const to = toSeparator.replace(paramKey, param)
    return current.replace(from, to)
  }, path)

  return resolvedPath
}
