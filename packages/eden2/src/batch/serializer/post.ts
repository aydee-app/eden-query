import type { EdenRequestParams } from '../../core/request'
import { resolveFetchOptions } from '../../core/resolve'
import { getTransformer } from '../../trpc/client/transformer'
import { extractFiles } from '../../utils/file'

const KEYS = {
  method: 'method',
  path: 'path',
  body: 'body',
  bodyType: 'body_type',
  query: 'query',
  filePaths: 'files.path',
  files: 'files.files',
  transformed: 'transformer',
  transformerId: 'transformer-id',
} as const

/**
 * If using POST request to batch, most of the request data will be encoded in the FormData body.
 *
 * It will look like this:
 *
 * {
 *   // POST request to /api/a with a JSON body of { value: 0 }
 *
 *   '0.path': '/api/a',
 *   '0.method': 'POST',
 *   '0.body_type': 'JSON',
 *   '0.body': '{ value: 0 }'
 *
 *   // GET request to /api/b?name=elysia, i.e. query of name=elysia
 *
 *   '1.path': '/api/b',
 *   '1.method': 'GET',
 *   '1.query.name': 'elysia'
 * }
 */
export async function serializeBatchPostParams(batchParams: EdenRequestParams[]) {
  const body = new FormData()

  const headers = new Headers()

  const operations = batchParams.map(async (params, index) => {
    const { path, query, fetchInit } = await resolveFetchOptions(params)

    if (fetchInit.method) {
      body.append(`${index}.${KEYS.method}`, fetchInit.method)
    }

    body.append(`${index}.${KEYS.path}`, path + (query ? '?' : '') + query)

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

    body.append(`${index}.${KEYS.bodyType}`, 'json')

    const transformer = getTransformer(params)

    if (transformer) {
      if (transformer.id) {
        body.append(`${index}.${KEYS.transformerId}`, transformer.id)
      }

      body.append(`${index}.${KEYS.transformed}`, 'true')

      fetchInit.body = transformer.input.serialize(fetchInit?.body)
    }

    const stringified = JSON.stringify(fetchInit.body)

    body.set(`${index}.${KEYS.body}`, stringified)

    const files = extractFiles(fetchInit?.body)

    for (const file of files) {
      body.append(`${index}.${KEYS.filePaths}`, file.path)
      body.append(`${index}.${KEYS.files}`, file.file)
    }
  })

  await Promise.all(operations)

  return { body, query: {}, headers }
}
