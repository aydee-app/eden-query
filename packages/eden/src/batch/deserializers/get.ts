import type { EdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import { BODY_KEYS, IGNORED_HEADERS } from '../shared'
import type { BatchDeserializerConfig } from './config'

export async function deserializeBatchGetParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(context: InternalContext, _config: BatchDeserializerConfig) {
  const result: Array<EdenRequestOptions> = []

  const request = context.request

  const url = new URL(request.url)

  const searchParams = url.searchParams.entries()

  const globalHeaders: any = {}

  const globalQuery: any = {}

  for (const [key, value] of request.headers) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      if (!IGNORED_HEADERS.includes(index.toLowerCase())) {
        globalHeaders[index] = value
      }
      continue
    }

    if (IGNORED_HEADERS.includes(name.toLowerCase())) continue

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    result[paramIndex] ??= {}
    result[paramIndex].headers ??= {}
    ;(result[paramIndex].headers as any)[name] = value
  }

  for (const [key, value] of searchParams) {
    const [index, name, queryKey] = key.split('.')

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) {
      globalQuery[key] = value
      continue
    }

    switch (name) {
      case BODY_KEYS.query: {
        if (queryKey == null) continue

        result[paramIndex] ??= {}
        result[paramIndex].input ??= {}
        result[paramIndex].input.query ??= {}
        ;(result[paramIndex].input.query as any)[queryKey] = value

        continue
      }

      case BODY_KEYS.path: {
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
      result.input ??= {}
      result.input.query ??= {}
      ;(result.input.query as any)[key] = globalQuery[key]
    }
  }

  return definedResults as Array<EdenRequestOptions<TElysia, TConfig>>
}
