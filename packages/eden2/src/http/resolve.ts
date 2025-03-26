import type { AnyElysia, MaybeArray, MaybePromise } from 'elysia'

import { isServer } from '../constants'
import { EdenFetchError } from '../errors'
import type { InferRouteBody,InferRouteOptions } from '../infer'
import { createNewFile, hasFile } from '../utils/file'
import { buildQueryString, isGetOrHeadMethod } from '../utils/http'
import { toArray } from '../utils/to-array'
import type { Nullish } from '../utils/types'
import { getFetch } from './get-fetch'
import { getResponseData } from './response'
import type { HTTPHeaders } from './types'

export type EdenRequestHeadersResolver = (params: EdenRequestParams) => HTTPHeaders | Nullish

export type EdenRequestHeaders = MaybeArray<HTTPHeaders | EdenRequestHeadersResolver>

/**
 * @param edenRequestHeaders The input headers to resolve, a superset of regular request headers.
 * @param fetchInit The options that the fetch function will be called with.
 * @param params The raw, original argument passed to the resolver function.
 * @param [headers={}] The currently accumulated headers result.
 */
async function processHeaders(
  edenRequestHeaders: EdenRequestHeaders | Nullish,
  fetchInit: RequestInit = {},
  params: EdenRequestParams,
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (Array.isArray(edenRequestHeaders)) {
    for (const value of edenRequestHeaders) {
      if (!Array.isArray(value)) {
        headers = await processHeaders(value, fetchInit, params, headers)
        continue
      }

      const key = value[0]

      if (typeof key === 'string') {
        headers[key.toLowerCase()] = value[1] as string
        continue
      }

      for (const [k, value] of key) {
        if (k) {
          headers[k.toLowerCase()] = value as string
        }
      }
    }

    return headers
  }

  if (!edenRequestHeaders) return headers

  switch (typeof edenRequestHeaders) {
    case 'function':
      if (edenRequestHeaders instanceof Headers) {
        return await processHeaders(edenRequestHeaders, fetchInit, params, headers)
      }

      const v = edenRequestHeaders(params)

      if (v) {
        return await processHeaders(v, fetchInit, params, headers)
      }

      return headers

    case 'object':
      if (edenRequestHeaders instanceof Headers) {
        edenRequestHeaders.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })

        return headers
      }

      for (const [key, value] of Object.entries(edenRequestHeaders)) {
        headers[key.toLowerCase()] = value as string
      }

      return headers

    default:
      return headers
  }
}

/**
 * Global/general settings that influence the behavior of the resolver.
 */
export interface EdenResolverConfig {
  fetch?: Omit<RequestInit, 'headers' | 'method'>

  fetcher?: typeof fetch

  headers?: EdenRequestHeaders

  onRequest?: MaybeArray<(path: string, options: RequestInit) => MaybePromise<RequestInit | void>>

  onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>

  keepDomain?: boolean
}

/**
 * Resolver input for a specific request.
 */
export interface EdenRequestInit<T extends AnyElysia = AnyElysia> {
  /**
   */
  domain?: T | string

  /**
   * Fetch options for a "query" method, i.e. "GET", "HEAD", "OPTIONS".
   */
  options?: InferRouteOptions

  /**
   * The request body for "POST", "PATCH", etc. requests.
   */
  body?: InferRouteBody

  /**
   */
  path?: string

  /**
   */
  method?: string
}

/**
 * Parameters that control how an Eden request is resolved.
 *
 * Some information is duplicated in the {@link EdenResolverConfig} properties.
 * For example, {@link EdenRequestParams.options.headers} and {@link EdenResolverConfig.headers}.
 * Values in the request-specific options will have greater precedence
 * than the global resolver configuration options.
 */
export interface EdenRequestParams<T extends AnyElysia = AnyElysia>
  extends EdenResolverConfig,
    EdenRequestInit<T> {}

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

  const body: any = params.body

  let fetchInit = {
    method: params.method?.toUpperCase(),
    body,
    ...params?.fetch,
    headers,
  } satisfies RequestInit

  fetchInit.headers = {
    ...headers,
    ...(await processHeaders(params.options?.headers, fetchInit, params)),
  }

  if (isGetOrHead) {
    delete fetchInit.body
  }

  // ? Duplicate because end-user might add a body in onRequest
  if (isGetOrHead) delete fetchInit.body

  // Don't handle raw FormData if given.
  if (FormData != null && params.body instanceof FormData) {
    // noop
  } else if (hasFile(body)) {
    const formData = new FormData()

    // FormData is 1 level deep
    for (const [key, field] of Object.entries(fetchInit.body)) {
      if (isServer) {
        formData.append(key, field as any)

        continue
      }

      if (field instanceof File) {
        formData.append(key, await createNewFile(field as any))

        continue
      }

      if (field instanceof FileList) {
        for (let i = 0; i < field.length; i++)
          formData.append(key as any, await createNewFile((field as any)[i]))

        continue
      }

      if (Array.isArray(field)) {
        for (let i = 0; i < field.length; i++) {
          const value = (field as any)[i]

          formData.append(key as any, value instanceof File ? await createNewFile(value) : value)
        }

        continue
      }

      formData.append(key, field as string)
    }

    // We don't do this because we need to let the browser set the content type with the correct boundary
    // fetchInit.headers['content-type'] = 'multipart/form-data'
    fetchInit.body = formData
  } else if (typeof body === 'object') {
    fetchInit.headers['content-type'] = 'application/json'
    fetchInit.body = JSON.stringify(body)
  } else if (body !== undefined && body !== null) {
    fetchInit.headers['content-type'] = 'text/plain'
  }

  if (isGetOrHead) {
    delete fetchInit.body
  }

  if (params.onRequest) {
    const onRequest = toArray(params.onRequest)

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
  }

  const domain = typeof params.domain === 'string' ? params.domain : ''

  const elysia = typeof params.domain === 'string' ? undefined : params.domain

  const url = domain + path + query

  const fetcher = getFetch(params.fetcher)

  const request = elysia?.handle(new Request(url, fetchInit)) ?? fetcher(url, fetchInit)

  const response = await request

  let data = null

  let error = null

  if (params.onResponse) {
    const onResponse = toArray(params.onResponse)

    for (const value of onResponse)
      try {
        const temp = await value(response.clone())

        if (temp !== undefined && temp !== null) {
          data = temp
          break
        }
      } catch (err) {
        if (err instanceof EdenFetchError) {
          error = err
        } else {
          error = new EdenFetchError(422, err)
        }

        break
      }

    if (data !== null) {
      return {
        data,
        error,
        response,
      }
    }
  }

  if (response.status >= 300 || response.status < 200) {
    error = new EdenFetchError(response.status, data)
    data = null
  } else {
    data = getResponseData(response)
  }

  return {
    data,
    error,
    response,
  }
}
