export function isKey(value: string) {
  return /^\w*$/.test(value)
}

export function isObjectType(value: unknown): value is object {
  return typeof value === 'object'
}

export function isObject<T extends object>(value: unknown): value is T {
  return value != null && !Array.isArray(value) && isObjectType(value) && !(value instanceof Date)
}

export function stringToPath(input: string): string[] {
  const path = input.replace(/["|']|\]/g, '').split(/\.|\[/)
  return Array.isArray(path) ? path.filter(Boolean) : []
}

/**
 * Given a dot-concatenated string path, deeply set a property, filling in any missing objects along the way.
 */
export function set<T>(object: unknown, path: PropertyKey, value?: unknown): T {
  if (object == null) {
    return value as any
  }

  if (typeof path === 'number' || typeof path === 'symbol') {
    object[path as never] = value as never
    return object[path as never] as T
  }

  const keyArray = isKey(path) ? [path] : stringToPath(path)

  const lastIndex = keyArray.length - 1

  const lastKey = keyArray[lastIndex]

  const result = keyArray.reduce((currentResult, currentKey, index) => {
    if (index === lastIndex) {
      currentResult[currentKey as never] = value as never
      return currentResult
    }

    const current = currentResult[currentKey as never]

    if (current == null || (!isObject(current) && !Array.isArray(current))) {
      currentResult[currentKey as never] = (isNaN(keyArray[index + 1] as any) ? {} : []) as never
    }

    return currentResult[currentKey as never]
  }, object)

  return result[lastKey as never] as T
}
