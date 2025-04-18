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

export interface QueryStringOptions {
  /**
   * @default '&'
   */
  separator?: string
}

export function buildQueryString(init?: URLSearchParamsInit, options?: QueryStringOptions): string {
  let result = ''

  if (init === null || typeof init !== 'object') return result

  const input = new URLSearchParams(init as any)

  const separator = options?.separator ?? '&'

  input.entries().forEach(([key, value], i) => {
    const encodedKey = encodeURIComponent(key) + '='
    if (i) result += separator
    result += encodedKey
    result += getAsPrimitive(value)
  })

  return result
}

export type URLSearchParamsInit =
  | ConstructorParameters<typeof URLSearchParams>
  | URLSearchParams
  | Record<string, any>
  | undefined

export function mergeQuery(...queries: Array<URLSearchParamsInit>) {
  const params = queries.map((q) => new URLSearchParams(q as any))
  const entries = params.flatMap((p) => p.entries().toArray())
  const merged = new URLSearchParams(entries)
  return merged
}
