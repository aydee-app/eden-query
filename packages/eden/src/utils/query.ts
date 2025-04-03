function getAsPrimitive(value: unknown) {
  switch (typeof value) {
    case 'string':
      return encodeURIComponent(value)

    case 'bigint': // falls through
    case 'boolean':
      return '' + value

    case 'number': {
      if (!Number.isFinite(value)) return ''
      return value < 1e21 ? '' + value : encodeURIComponent('' + value)
    }

    default:
      return ''
  }
}

export type QueryValue = string | number | boolean | ReadonlyArray<string | number | boolean> | null

export function buildQueryString(input?: Record<string, QueryValue>): string {
  let result = ''

  if (input === null || typeof input !== 'object') return result

  const separator = '&'
  const keys = Object.keys(input)
  const keyLength = keys.length
  let valueLength = 0

  for (let i = 0; i < keyLength; i++) {
    const key = keys[i]

    if (key == null) continue

    const value = input[key]
    const encodedKey = encodeURIComponent(key) + '='

    if (i) {
      result += separator
    }

    if (Array.isArray(value)) {
      valueLength = value.length
      for (let j = 0; j < valueLength; j++) {
        if (j) {
          result += separator
        }

        // Optimization: Dividing into multiple lines improves the performance.
        // Since v8 does not need to care about the '+' character if it was one-liner.
        result += encodedKey
        result += getAsPrimitive(value[j])
      }
    } else {
      result += encodedKey
      result += getAsPrimitive(value)
    }
  }

  return result
}
