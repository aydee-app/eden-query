import type { InternalElysia } from '../elysia'
import { extractFiles } from '../utils/file'
import { buildQueryString } from '../utils/http'
import { jsonToFormData } from '../utils/json-to-formdata'
import { toArray } from '../utils/to-array'
import type { MaybePromise, Nullish } from '../utils/types'
import { EdenFetchError } from './errors'
import { getFetch } from './fetch'
import { type HeadersEsque, processHeaders } from './headers'
import type { EdenRequestParams } from './request'
import { type EdenResult, getResponseData } from './response'
import { matchTransformer, resolveTransformers } from './transform'

/**
 * Accepted headers includes any object that resembles headers, or a promise that resolves to one.
 * If a callback is provided, it will be called with the current params.
 * The callback can return header-esque objects to merge with the params, or mutate the params directly.
 * An array of the previously mentioned types can be provided, and each will be handled accordingly.
 */
export type EdenRequestHeaders<
  TElysia extends InternalElysia = {},
  TKey = undefined,
> = HeadersEsque<[EdenRequestParams<TElysia, TKey>]>

export type EdenRequestTransformer<TElysia extends InternalElysia = {}, TKey = undefined> = (
  path: string,
  options: RequestInit,
  params: EdenRequestParams<TElysia, TKey>,
) => MaybePromise<RequestInit | void>

export type EdenResponseTransformer<TElysia extends InternalElysia = {}, TKey = undefined> = (
  response: Response,
  params: EdenRequestParams<TElysia, TKey>,
) => MaybePromise<unknown>

export type EdenResultTransformer<TElysia extends InternalElysia = {}, TKey = undefined> = (
  result: EdenResult<any, EdenFetchError>,
  params: EdenRequestParams<TElysia, TKey>,
) => MaybePromise<EdenResult<any, EdenFetchError> | Nullish>

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

  headers = fetchInit.headers as any

  const transformer = matchTransformer(params.transformers, params.transformer)

  // Set the headers so the response body is transformed properly.
  // Transform the request body when needed.
  if (transformer) {
    if (transformer.id) {
      headers['transformer-id'] = transformer.id.toString()
    }

    headers['transformed'] = 'true'
  }

  if (fetchInit.body == null) return

  if (fetchInit.body instanceof FormData) return

  if (typeof fetchInit.body !== 'object') return

  const files = extractFiles(fetchInit.body)

  if (!files.length) {
    headers['content-type'] = 'application/json'
  }

  if (transformer) {
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

  if (!transformer) return

  if (result.data) {
    result.data = await transformer.output.deserialize(result.data)
  }

  if (result.error) {
    result.error.value = await transformer.output.deserialize(result.error.value)
  }
}) satisfies EdenResultTransformer

export function resolveEdenFetchPath<TElysia extends InternalElysia = {}, TKey = undefined>(
  params: EdenRequestParams<TElysia, TKey>,
) {
  if (!params.options?.params || !params.path) return params.path

  const paramEntries = Object.entries(params.options.params)

  const path = paramEntries.reduce((currentPath, [key, value]) => {
    return currentPath.replace(`:${key}`, String(value))
  }, params.path ?? '')

  return path
}

export async function resolveFetchOptions<TElysia extends InternalElysia = {}, TKey = undefined>(
  params: EdenRequestParams<TElysia, TKey> = {} as any,
) {
  const path = resolveEdenFetchPath(params) ?? ''

  const query = buildQueryString({ ...params.query, ...params.options?.query })

  let fetchInit: RequestInit = { ...params?.fetch }

  if (params.method) {
    fetchInit.method = params.method.toUpperCase()
  }

  if (params.body) {
    fetchInit.body = params.body as any
  }

  const onRequest = [
    ...toArray(params.onRequest),
    defaultOnRequest as EdenRequestTransformer<TElysia, TKey>,
  ]

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

  const onResult = [
    ...toArray(params.onResult),
    defaultOnResult as EdenResultTransformer<TElysia, TKey>,
  ]

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
export async function resolveEdenRequest<
  TElysia extends InternalElysia = InternalElysia,
  TKey = undefined,
>(params: EdenRequestParams<TElysia, TKey> = {} as any) {
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
