import type { EdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import { BODY_KEYS, IGNORED_HEADERS } from '../shared'
import type { BatchDeserializerConfig } from './config'

export async function deserializeBatchGetParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(context: InternalContext, _config?: BatchDeserializerConfig) {
  const result: Array<EdenRequestOptions> = []

  const request = context.request

  const url = new URL(request.url)

  const searchParams = url.searchParams.entries()

  const globalHeaders: any = {}

  const globalQuery: any = {}

  for (const [key, value] of searchParams) {
    const [indexOrName, name, ...queryKey] = key.split('.')

    const index = Number(indexOrName)

    if (Number.isNaN(index)) {
      globalQuery[key] = value
      continue
    }

    switch (name) {
      case BODY_KEYS.query: {
        const fullQueryKey = queryKey.join('.')

        if (!fullQueryKey) continue

        result[index] ??= {}
        result[index].input ??= {}
        result[index].input.query ??= {}
        ;(result[index].input.query as any)[fullQueryKey] = value

        continue
      }

      case BODY_KEYS.path: {
        result[index] ??= {}
        result[index].path = value
        continue
      }

      default:
        continue
    }
  }

  const definedResults = result.filter(Boolean)

  for (const [key, value] of request.headers) {
    const [indexOrName = '', name] = key.split('.')

    if (!name) {
      globalHeaders[indexOrName] = value
      continue
    }

    if (IGNORED_HEADERS.includes(name.toLowerCase())) continue

    const paramIndex = Number(indexOrName)

    if (Number.isNaN(paramIndex)) continue

    result[paramIndex] ??= {}
    result[paramIndex].input ??= {}
    result[paramIndex].input.headers ??= {}
    ;(result[paramIndex].input.headers as any)[name] = value
  }

  for (const key in globalHeaders) {
    if (IGNORED_HEADERS.includes(key.toLowerCase())) continue

    for (const result of definedResults) {
      result.headers ??= {}
      ;(result.headers as any)[key] = globalHeaders[key]
    }
  }

  for (const key in globalQuery) {
    for (const result of definedResults) {
      result.query ??= {}
      result.query[key] = globalQuery[key]
    }
  }

  return definedResults as Array<EdenRequestOptions<TElysia, TConfig>>
}
