import type { AnyElysia } from 'elysia'

import { hasFile } from '../utils/file'
import { buildQueryString, isGetOrHeadMethod } from '../utils/http'
import { jsonToFormData } from '../utils/json-to-formdata'
import { toArray } from '../utils/to-array'
import type { EdenRequestTransformer, EdenResponseTransformer } from './config'
import { EdenFetchError } from './errors'
import { getFetch } from './fetch'
import { processHeaders } from './headers'
import type { EdenRequestParams } from './request'
import { getResponseData } from './response'

const defaultOnRequest: EdenRequestTransformer = (_path, fetchInit) => {
  // Noop don't handle raw FormData passed to the resolver.
  if (typeof FormData !== 'undefined' && fetchInit.body instanceof FormData) {
    return
  }

  if (hasFile(fetchInit.body as any)) {
    const formData = jsonToFormData(fetchInit.body)

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

const defaultOnResponse: EdenResponseTransformer = async (response) => {
  const data = await getResponseData(response)

  if (response.status >= 400) {
    const error = new EdenFetchError(response.status, data)
    throw error
  }

  return data
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

  const query = buildQueryString(params.options?.query)

  let fetchInit = {
    method: params.method?.toUpperCase(),
    body: params.body as any,
    ...params?.fetch,
    headers,
  } satisfies RequestInit

  // GET and HEAD requests should not have a body.
  if (isGetOrHead) delete fetchInit.body

  // default request handler runs first and user-provided ones see the initially transformed result.
  const onRequest = [defaultOnRequest, ...toArray(params.onRequest)]

  for (const value of onRequest) {
    const temp = await value(path, fetchInit)

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

  const domain = typeof params.domain === 'string' ? params.domain : ''

  const elysia = typeof params.domain === 'string' ? undefined : params.domain

  const url = domain + path + query

  const fetcher = getFetch(params.fetcher)

  const request = elysia?.handle(new Request(url, fetchInit)) ?? fetcher(url, fetchInit)

  const response = await request

  // Default onResponse handler runs last after all user provided ones.
  const onResponse = [...toArray(params.onResponse), defaultOnResponse]

  let currentResponse: typeof response | undefined = undefined

  // Stop when a error occurs or first defined data is returned by handler.
  try {
    for (const value of onResponse) {
      // Lazily clone the response to process.
      // If there is only the default response transformer, it will not be cloned.
      currentResponse = currentResponse ? currentResponse.clone() : response

      const data = await value(currentResponse)

      if (data != null) return { error: null, data, response }
    }
  } catch (err) {
    const error = err instanceof EdenFetchError ? err : new EdenFetchError(422, err)
    return { error, data: null, response }
  }

  // If nothing was able to handle the response, return error response.

  return {
    error: new EdenFetchError(422, 'Unhandled response'),
    data: null,
    response,
  }
}
