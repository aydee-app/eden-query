import type { BatchPluginConfig, EdenTypeConfig } from '../../core/config'
import type { EdenRequestParams } from '../../core/request'
import type { InternalContext, InternalElysia } from '../../elysia'
import { IGNORED_HEADERS } from '../shared'

export async function deserializeBatchGetParams<
  TElysia extends InternalElysia = InternalElysia,
  TKey extends EdenTypeConfig = undefined,
>(context: InternalContext, _config: BatchPluginConfig<TElysia, TKey>) {
  const result: Array<EdenRequestParams> = []

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

  return definedResults as Array<EdenRequestParams<TElysia, TKey>>
}
