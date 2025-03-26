import { GET_OR_HEAD_HTTP_METHODS, HTTP_METHODS } from '../constants'

export function isHttpMethod(value: unknown): boolean {
  return HTTP_METHODS.includes(value as any)
}

export function isGetOrHeadMethod(value: unknown): boolean {
  return GET_OR_HEAD_HTTP_METHODS.includes(value as any)
}

export function buildQueryString(query?: Record<string, any>) {
  if (query == null) return ''

  const queryString = Object.entries(query)
    .flatMap((entry) => {
      const [key, value] = entry

      if (Array.isArray(value)) {
        return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&')
      }

      if (typeof value === 'object') {
        return `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`
      }

      if (value == null) return

      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .filter(Boolean)
    .join('&')

  const prefix = queryString ? '?' : ''

  const prefixedQueryString = `${prefix}${queryString}`

  return prefixedQueryString
}
