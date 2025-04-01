import type { InternalElysia } from '../elysia'
import { extractFiles } from '../utils/file'
import { buildQueryString } from '../utils/http'
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
import { matchTransformer, resolveTransformers } from './transform'

/**
 * Default request transformer just handles transforming the body.
 *
 * @param fetchInit
 * {@link RequestInit} options after being initially processed by {@link resolveEdenRequest}.
 * This means that {@link RequestInit.headers} should have been "cast" to an object.
 */
export const defaultOnRequest = (async (_path, fetchInit, params) => {
  let headers = await processHeaders(params?.headers, params)

  fetchInit.headers = { ...fetchInit.headers, ...headers }

  if (fetchInit.body == null) return

  if (fetchInit.body instanceof FormData) return

  if (typeof fetchInit.body !== 'object') return

  headers = fetchInit.headers as any

  const transformer = matchTransformer(params.transformers, params.transformer)

  const files = extractFiles(fetchInit.body)

  if (!files.length) {
    headers['content-type'] = 'application/json'
  }

  if (transformer) {
    if (transformer.id) {
      headers['transformer-id'] = transformer.id.toString()
    }

    headers['transformed'] = 'true'

    fetchInit.body = await transformer.input.serialize(fetchInit.body)

    const stringified = JSON.stringify(fetchInit.body)

    if (!files.length) {
      headers['content-type'] = 'application/json'
      fetchInit.body = stringified
      return
    }

    fetchInit.body = new FormData()

    fetchInit.body.append('body', stringified)

    for (const file of files) {
      fetchInit.body.append('files.file', file.file)
      fetchInit.body.append('files.path', file.path)
    }

    return
  }

  if (files.length) {
    const formData = await jsonToFormData(fetchInit.body)
    fetchInit.body = formData
    return
  }

  fetchInit.body = JSON.stringify(fetchInit.body)
}) satisfies EdenRequestTransformer

export const defaultOnResponse = (async (response) => {
  const data = await getResponseData(response)

  if (response.status >= 400) {
    const error = new EdenFetchError(response.status, data)
    throw error
  }

  return data
}) satisfies EdenResponseTransformer

export const defaultOnResult = (async (result, params) => {
  const transformers = resolveTransformers(params.transformer)

  const transformer = transformers[0]

  if (transformer) {
    result.data = await transformer.output.deserialize(result.data)
  }
}) satisfies EdenResultTransformer

export function resolveEdenFetchPath(params: EdenRequestParams) {
  if (!params.options?.params || !params.path) return params.path

  const paramEntries = Object.entries(params.options.params)

  const path = paramEntries.reduce((currentPath, [key, value]) => {
    return currentPath.replace(`:${key}`, String(value))
  }, params.path ?? '')

  return path
}

export async function resolveFetchOptions(params: EdenRequestParams = {}) {
  const path = resolveEdenFetchPath(params) ?? ''

  const query = buildQueryString({ ...params.query, ...params.options?.query })

  let fetchInit: RequestInit = { ...params?.fetch }

  if (params.method) {
    fetchInit.method = params.method.toUpperCase()
  }

  if (params.body) {
    fetchInit.body = params.body as any
  }

  const onRequest = [...toArray(params.onRequest), defaultOnRequest]

  for (const value of onRequest) {
    const temp = await value(path, fetchInit, params)

    if (typeof temp !== 'object') continue

    fetchInit = { ...fetchInit, ...temp }

    const headers = await processHeaders(temp?.headers, params)

    if (headers) {
      fetchInit.headers ??= {}
      fetchInit.headers = { ...fetchInit.headers, ...headers }
    }
  }

  const onResponse = [...toArray(params.onResponse), defaultOnResponse]

  const onResult = [...toArray(params.onResult), defaultOnResult]

  return { path, query, fetchInit, onResponse, onResult }
}

/**
 * Resolve an eden request to a presumably Elysia.js backend.
 * Also handles transformations.
 *
 * When compared to tRPC, this function represents both:
 * - universalRequester {@see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/httpLink.ts#L90}
 * - transformResult {@see https://github.com/trpc/trpc/blob/5597551257ad8d83dbca7272cc6659756896bbda/packages/client/src/links/httpLink.ts#L112}
 */
export async function resolveEdenRequest<T extends InternalElysia>(
  params: EdenRequestParams<T> = {},
) {
  const { path, query, fetchInit, onResult, onResponse } = await resolveFetchOptions(params)

  const domain = typeof params.domain === 'string' ? params.domain : ''

  const elysia = typeof params.domain === 'string' ? undefined : params.domain

  const base = domain || params.base

  const url = (base || '') + (path || '/') + (query ? '?' : '') + query

  const fetcher = getFetch(params.fetcher)

  const request = elysia?.handle?.(new Request(url, fetchInit)) ?? fetcher(url, fetchInit)

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
