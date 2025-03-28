import type { EdenRequestParams } from '../../core/request'
import { resolveFetchOptions } from '../../core/resolve'
import { extractFiles } from '../../utils/file'

const KEYS = {
  method: 'method',
  path: 'path',
  body: 'body',
  bodyType: 'body_type',
  query: 'query',
  filePaths: 'files.path',
  files: 'files.files',
  transformed: 'transformed',
  transformerId: 'transformer-id',
} as const

export async function serializeBatchPostParams(batchParams: EdenRequestParams[]) {
  const body = new FormData()

  const headers = new Headers()

  const operations = batchParams.map(async (params, index) => {
    const { path, query, fetchInit } = await resolveFetchOptions(params)

    if (fetchInit.method) {
      body.append(`${index}.${KEYS.method}`, fetchInit.method)
    }

    body.append(`${index}.${KEYS.path}`, `${path}${query}`)

    for (const key in fetchInit.headers) {
      const value = fetchInit.headers[key]

      if (value) {
        headers.append(`${index}.${key}`, value)
      }
    }

    if (fetchInit?.body == null) return

    if (fetchInit.body instanceof FormData) {
      body.append(`${index}.${KEYS.bodyType}`, 'formdata')

      fetchInit?.body.forEach((value, key) => {
        body.set(`${index}.${KEYS.body}.${key}`, value)
      })

      return
    }

    const contentType = fetchInit.headers['content-type']?.split(';')[0]

    if (contentType !== 'application/json') return

    body.append(`${index}.${KEYS.bodyType}`, 'json')
    body.set(`${index}.${KEYS.body}`, fetchInit.body)

    const files = extractFiles(fetchInit?.body)

    for (const file of files) {
      body.append(`${index}.${KEYS.filePaths}`, file.path)
      body.append(`${index}.${KEYS.files}`, file.file)
    }
  })

  await Promise.all(operations)

  return { body, query: {}, headers }
}
