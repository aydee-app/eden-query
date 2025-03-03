import type { StoreOrVal } from '@tanstack/svelte-query'
import { derived, get, type Readable, readable } from 'svelte/store'

import type { EdenTreatyQueryRootHooks } from '../implementation/treaty'
import { isStore } from './is-store'
import type { LiteralUnion } from './literal-union'

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
  if (args.length !== 1) {
    return
  }

  const argument = args[0]

  /**
   * Extract the value of a writable.
   */
  const argumentValue = isStore(argument) ? get(argument) : argument

  if (argumentValue == null || typeof argumentValue !== 'object') {
    return
  }

  const argumentKeys = Object.keys(argumentValue)

  const pathParam = argumentKeys[0]

  if (argumentKeys.length !== 1 || pathParam == null) {
    return
  }

  // At this point, assume that it's either a StoreOrVal with a valid object representing route params.

  return { param: argument as any, key: argumentKeys[0] }
}

const hooksToMutateArgs: (keyof EdenTreatyQueryRootHooks | LiteralUnion<string> | symbol)[] = [
  'createQuery',
  'createInfiniteQuery',
  'createMutation',
]
/**
 * Directly mutate the arguments passed to the root hooks.
 *
 * Make sure that the interpretation of args matches up with the implementation of root hooks.
 *
 * For now, only tanstack-query hooks should be transformed.
 *
 * createMutation has to be handled differently from any query-related hooks...
 */
export function mutateArgs(
  hook: keyof EdenTreatyQueryRootHooks | LiteralUnion<string> | symbol,
  args: unknown[],
  params: StoreOrVal<Record<string, any>>[],
) {
  if (!hooksToMutateArgs.includes(hook)) return

  const firstArg = args[0]

  // Nothing to convert.
  if (firstArg == null && params.length === 0) {
    return args
  }

  const isFirstArgReadable = isStore(firstArg)

  const paramsStores: Readable<Record<string, any>>[] = []

  const staticParams: Record<string, any> = {}

  for (const param of params) {
    if (isStore(param)) {
      paramsStores.push(param)
      continue
    }

    for (const key in param) {
      staticParams[key] = param[key as any]
    }
  }

  // Try to preserve everything as JSON unless absolutely necessary.
  if (!isFirstArgReadable && !paramsStores.length) {
    if (hook === 'createMutation') {
      args[0] = { ...(firstArg ?? {}), params: staticParams }

      return
    }

    args[0] = { query: firstArg, params: staticParams }

    return
  }

  const queryOrOptionsStore = isFirstArgReadable ? firstArg : readable(firstArg)

  const paramsStore = derived(paramsStores, ($paramsStores) => {
    const resolvedParams = { ...staticParams }

    for (const param of $paramsStores) {
      for (const key in param) {
        resolvedParams[key] = param[key]
      }
    }

    return resolvedParams
  })

  const optionsStores = [queryOrOptionsStore, paramsStore]

  const resolvedOptionsStore = derived(optionsStores, ([$queryOrOtions, $params]) => {
    if (hook === 'createMutation') {
      return { ...($queryOrOtions ?? {}), params: $params }
    }

    return { query: $queryOrOtions, params: $params }
  })

  args[0] = resolvedOptionsStore

  return args
}
