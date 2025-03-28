import type { EdenRequestParams } from '../../core/request'

/**
 * Temporary fix to ignore these headers from the batch request.
 */
const ignoreHeaders = ['content-type', 'content-length']

export async function deserializeBatchGetParams(request: Request) {
  const result: Array<EdenRequestParams> = []

  const url = new URL(request.url)

  const searchParams = url.searchParams.entries()

  const globalHeaders: any = {}

  const globalQuery: any = {}

  for (const [key, value] of request.headers) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      if (!ignoreHeaders.includes(index.toLowerCase())) {
        globalHeaders[index] = value
      }
      continue
    }

    if (ignoreHeaders.includes(name.toLowerCase())) continue

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    result[paramIndex] ??= {}
    result[paramIndex].headers ??= {}
    ;(result[paramIndex].headers as any)[name] = value
  }

  for (const [key, value] of searchParams) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      globalQuery[index] = value
      continue
    }

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    switch (name) {
      case 'query': {
        result[paramIndex] ??= {}
        result[paramIndex].options ??= {}
        result[paramIndex].options.query ??= {}
        ;(result[paramIndex].options.query as any)[name] = value
        continue
      }

      case 'path': {
        result[paramIndex] ??= {}
        result[paramIndex].path = value
        continue
      }

      default:
        continue
    }
  }

  const definedResults = result.filter(Boolean)

  for (const key in globalHeaders) {
    for (const result of definedResults) {
      result.headers ??= {}
      ;(result.headers as any)[key] = globalHeaders[key]
    }
  }

  for (const key in globalQuery) {
    for (const result of definedResults) {
      result.options ??= {}
      result.options.query ??= {}
      ;(result.options.query as any)[key] = globalQuery[key]
    }
  }

  return definedResults
}
