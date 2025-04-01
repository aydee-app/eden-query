import type { EdenRequestParams } from '../../core/request'
import { resolveFetchOptions } from '../../core/resolve'
import type { InternalElysia } from '../../elysia'
import { extractFiles } from '../../utils/file'
import { BODY_KEYS, BODY_TYPES } from '../shared'

export async function serializeBatchPostParams<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
>(batchParams: EdenRequestParams<TElysia, TKey>[]) {
  const body = new FormData()

  const headers = new Headers()

  const operations = batchParams.map(async (params, index) => {
    const { path, query, fetchInit } = await resolveFetchOptions(params)

    if (fetchInit?.method) {
      body.append(`${index}.${BODY_KEYS.method}`, fetchInit.method)
    }

    const fetchInitHeaders: any = fetchInit?.headers

    body.append(`${index}.${BODY_KEYS.path}`, `${path}${query ? '?' : ''}${query}`)

    if (fetchInit?.headers) {
      for (const key in fetchInit.headers) {
        const value = fetchInitHeaders[key]

        if (value) {
          headers.append(`${index}.${key}`, value)
        }
      }
    }

    if (fetchInit?.body == null) return

    if (fetchInit.body instanceof FormData) {
      body.append(`${index}.${BODY_KEYS.bodyType}`, BODY_TYPES.FORM_DATA)

      fetchInit?.body.forEach((value, key) => {
        body.set(`${index}.${BODY_KEYS.body}.${key}`, value)
      })

      return
    }

    const contentType = fetchInitHeaders['content-type']?.split(';')[0]

    if (contentType !== 'application/json') return

    const fetchInitBody: any = fetchInit?.body

    body.append(`${index}.${BODY_KEYS.bodyType}`, BODY_TYPES.JSON)
    body.set(`${index}.${BODY_KEYS.body}`, fetchInitBody)

    const files = extractFiles(fetchInitBody)

    for (const file of files) {
      body.append(`${index}.${BODY_KEYS.filePaths}`, file.path)
      body.append(`${index}.${BODY_KEYS.files}`, file.file)
    }
  })

  await Promise.all(operations)

  return { body, query: {}, headers }
}
