import type { AnyElysia } from 'elysia'

import { getTransformer } from '../trpc/client/transformer'
import { extractFiles, hasFile } from '../utils/file'
import { buildQueryString, isGetOrHeadMethod } from '../utils/http'
import { jsonToFormData } from '../utils/json-to-formdata'
import { toArray } from '../utils/to-array'
import type {
  EdenRequestTransformer,
  EdenResponseTransformer,
  EdenResultTransformer,
} from './config'
import { EdenFetchError } from './errors'
import { getFetch } from './fetch'
import { processHeaders } from './headers'
import type { EdenRequestParams } from './request'
import { type EdenResult, getResponseData } from './response'

export const defaultOnRequest: EdenRequestTransformer = async (_path, fetchInit, params) => {
  // Noop don't handle raw FormData passed to the resolver.
  if (typeof FormData !== 'undefined' && fetchInit.body instanceof FormData) {
    return
  }

  const transformer = getTransformer(params)

  if (transformer && fetchInit.body && typeof fetchInit.body !== 'string') {
    const files = extractFiles(fetchInit.body)

    fetchInit.headers ??= {}

    const headers: any = fetchInit.headers

    if (transformer.id) {
      headers['transformer-id'] = transformer.id
    }

    headers['transformed'] = true
    headers['content-type'] = 'application/json'

    if (files.length) {
      const body = new FormData()

      fetchInit.body = await transformer.input.serialize(fetchInit.body)

      const stringified = JSON.stringify(fetchInit.body)

      body.append('body', stringified)

      for (const file of files) {
        body.append('files.path', file.path)
        body.append('files.file', file.file)
      }

      fetchInit.body = body
    } else {
      const serialized = await transformer.input.serialize(fetchInit.body)

      const stringified = JSON.stringify(serialized)

      fetchInit.body = stringified
    }

    return
  }

  if (hasFile(fetchInit.body as any)) {
    const formData = await jsonToFormData(fetchInit.body)

    // We don't do this because we need to let the browser set the content type with the correct boundary
    // fetchInit.headers['content-type'] = 'multipart/form-data'
    ;(fetchInit.body as any) = formData

    return
  }

  if (typeof fetchInit.body === 'object') {
    ;(fetchInit.headers as any)['content-type'] = 'application/json'

    fetchInit.body = JSON.stringify(fetchInit.body)

    return
  }

  if (fetchInit.body !== null) {
    ;(fetchInit.headers as any)['content-type'] = 'text/plain'
  }
}

export const defaultOnResponse: EdenResponseTransformer = async (response) => {
  const data = await getResponseData(response)

  if (response.status >= 400) {
    const error = new EdenFetchError(response.status, data)
    throw error
  }

  return data
}

export const defaultOnResult: EdenResultTransformer = async (result, params) => {
  const transformer = getTransformer(params)

  if (transformer) {
    result.data = await transformer.output.deserialize(result.data)
  }
}

export async function resolveFetchOptions(params: EdenRequestParams) {
  let path = params.path ?? ''

  if (params.options?.params != null) {
    Object.entries(params.options.params).forEach(([key, value]) => {
      if (value != null) {
        path = path.replace(`:${key}`, String(value))
      }
    })
  }

  const isGetOrHead = isGetOrHeadMethod(params.method)

  const headers = await processHeaders(params?.headers, params.options, params)

  const query = buildQueryString({ ...params.query, ...params.options?.query })

  let fetchInit = {
    method: params.method?.toUpperCase(),
    body: params.body as any,
    ...params?.fetch,
    headers,
  } satisfies RequestInit

  // GET and HEAD requests should not have a body.
  if (isGetOrHead) delete fetchInit.body

  // default request handler runs first and user-provided ones see the initially transformed result.
  const onRequest = [...toArray(params.onRequest), defaultOnRequest]

  for (const value of onRequest) {
    const temp = await value(path, fetchInit, params)

    if (typeof temp === 'object')
      fetchInit = {
        ...fetchInit,
        ...temp,
        headers: {
          ...fetchInit.headers,
          ...(await processHeaders(temp?.headers, fetchInit, params)),
        },
      }
  }

  const onResponse = [...toArray(params.onResponse), defaultOnResponse]

  const onResult = [...toArray(params.onResult), defaultOnResult]

  return { path, fetchInit, query, onResponse, onResult }
}

/**
 * Resolve an eden request to a presumably Elysia.js backend.
 * Also handles transformations.
 *
 * When compared to tRPC, this function represents both:
 * - universalRequester {@see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/httpLink.ts#L90}
 * - transformResult {@see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/httpLink.ts#L112}
 */
export async function resolveEdenRequest<T extends AnyElysia>(params: EdenRequestParams<T>) {
  const { path, query, fetchInit, onResult, onResponse } = await resolveFetchOptions(params)

  const domain = typeof params.domain === 'string' ? params.domain : ''

  const elysia = typeof params.domain === 'string' ? undefined : params.domain

  const base = domain || params.base

  const url = base + path + query

  const fetcher = getFetch(params.fetcher)

  const request = elysia?.handle(new Request(url, fetchInit)) ?? fetcher(url, fetchInit)

  const response = await request

  let currentResponse: typeof response | undefined = undefined

  let result: EdenResult<any, EdenFetchError>

  try {
    for (const value of onResponse) {
      currentResponse = currentResponse ? currentResponse.clone() : response

      const data = await value(currentResponse, params)

      if (data != null) {
        result = { error: null, data, response }
        break
      }
    }
  } catch (err) {
    const error = err instanceof EdenFetchError ? err : new EdenFetchError(422, err)
    result = { error, data: null, response }
  }

  result ||= {
    error: new EdenFetchError(422, 'Unhandled response'),
    data: null,
    response,
  }

  for (const value of onResult) {
    const newResult = await value(result, params)
    result = newResult || result
  }

  return result
}
