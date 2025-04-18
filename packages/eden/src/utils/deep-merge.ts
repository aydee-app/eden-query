export interface DeepMergeOptions {
  skipKeys?: string[]
  override?: boolean
}

function isObject(item: any): item is object {
  return item && typeof item === 'object' && !Array.isArray(item)
}

export const isNotEmpty = (obj?: object) => {
  if (!obj) return false

  for (const _x in obj) return true

  return false
}

export function isClass(v: object) {
  return (
    (typeof v === 'function' && /^\s*class\s+/.test(v.toString())) ||
    // Handle Object.create(null)
    (v.toString &&
      // Handle import * as Sentry from '@sentry/bun'
      // This also handle [object Date], [object Array]
      // and FFI value like [object Prisma]
      v.toString().startsWith('[object ') &&
      v.toString() !== '[object Object]') ||
    // If object prototype is not pure, then probably a class-like object
    isNotEmpty(Object.getPrototypeOf(v))
  )
}

/**
 * @see https://github.com/elysiajs/elysia/blob/a35b26de4451da96f993917ca97cb95b5fc0401a/src/utils.ts#L64C1-L98C2
 */
export function deepMerge<A extends Record<string, any>, B extends Record<string, any>>(
  target: A = {} as any,
  source: B = {} as any,
  options?: DeepMergeOptions,
): A & B {
  if (!isObject(target) || !isObject(source)) return target as any

  for (const [key, value] of Object.entries(source)) {
    if (options?.skipKeys?.includes(key)) continue

    if (!isObject(value) || !(key in target) || isClass(value)) {
      if (options?.override || !(key in target)) {
        target[key as keyof typeof target] = value
      }

      continue
    }

    const inner = deepMerge((target as any)[key] as any, value, options)

    target[key as keyof typeof target] = inner
  }

  return target as A & B
}
