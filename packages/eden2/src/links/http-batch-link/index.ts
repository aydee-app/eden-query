import type { AnyElysia } from 'elysia'

import { BATCH_ENDPOINT } from '../../constants'
import type { EdenFetchError } from '../../core/errors'
import type { EdenRequestParams } from '../../core/request'
import { resolveEdenRequest } from '../../core/resolve'
import type { EdenResponse } from '../../core/response'
import { Observable } from '../../observable'
import { getTransformer } from '../../trpc/client/transformer'
import { getDataTransformer } from '../../trpc/server/transformer'
import { handleHttpRequest, type HTTPLinkOptions } from '../http-link'
import type { Operation } from '../internal/operation'
import type { OperationLink } from '../internal/operation-link'
import { type BatchLoader, dataLoader } from './data-loader'

export type BatchMethod = 'GET' | 'POST'

export type HTTPBatchLinkOptions<T = any> = HTTPLinkOptions<T> & {
  /**
   * Path for the batch endpoint.
   *
   * @example /batch
   */
  endpoint?: string

  /**
   * Configure the maximum URL length if making batch requests with GET.
   */
  maxURLLength?: number

  /**
   * Maximum number of calls in a single batch request
   * @default Infinity
   */
  maxItems?: number

  method?: BatchMethod
}

/**
 * If using GET request to batch, the request data will be encoded in query parameters.
 * This is only possible if all requests are GET requests.
 *
 * The query will look like this
 *
 * // GET request to /api/b?name=elysia, i.e. query of name=elysia
 *
 * batch=1&0.path=/api/b&0.method=GET&0.query.name=elysia
 */
export function generateGetBatchRequestInformation(operations: Operation[]) {
  const query: Record<string, any> = {}

  const headers = new Headers()

  operations.forEach((operation, index) => {
    let operationPath = operation.params.path ?? ''

    // Handle path params.
    for (const key in operation.params.options?.params) {
      const placeholder = `:${key}`
      const param = operation.params.options.params[key as never]
      if (param != null) {
        operationPath = operationPath.replace(placeholder, param)
      }
    }

    query[`${index}.path`] = operationPath

    if (operation.params.method != null) {
      query[`${index}.method`] = operation.params.method
    }

    for (const key in operation.params.options?.query) {
      const value = operation.params.options.query[key as never]
      if (value != null) {
        query[`${index}.query.${key}`] = value
      }
    }

    // Handle headers.

    /**
     * These headers may be set at the root of the client as defaults.
     */
    const defaultHeaders =
      typeof operation.params.headers === 'function'
        ? operation.params.headers(operationPath, operation.params.fetch)
        : operation.params.headers

    /**
     * These headers are set on this specific request.
     */
    const requestHeaders = operation.params.options?.headers

    const resolvedHeaders = { ...defaultHeaders, ...requestHeaders }

    for (const key in resolvedHeaders) {
      const header = resolvedHeaders[key as never]
      if (header != null) {
        headers.append(key, header)
      }
    }
  })

  return { body: null, query, headers }
}

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
export function generatePostBatchRequestInformation(
  operations: Operation[],
  options?: HTTPBatchLinkOptions,
) {
  const body = new FormData()

  const headers = new Headers()

  operations.forEach((operation, index) => {
    let operationPath = operation.params.path ?? ''

    // Specify method of the request.
    if (operation.params.method != null) {
      body.append(`${index}.method`, operation.params.method)
    }

    // Handle path parameters.
    for (const key in operation.params.options?.params) {
      const placeholder = `:${key}`
      const param = operation.params.options.params[key as never]
      if (param != null) {
        operationPath = operationPath.replace(placeholder, param)
      }
    }

    // Specify the path of the request.
    body.append(`${index}.path`, operationPath)

    // Handle query parameters.
    for (const key in operation.params.options?.query) {
      const value = operation.params.options.query[key as never]

      if (value != null) {
        body.append(`${index}.query.${key}`, value)
      }
    }

    // Handle headers.

    /**
     * These headers may be set at the root of the client as defaults.
     */
    const defaultHeaders =
      typeof operation.params.headers === 'function'
        ? operation.params.headers(operationPath, operation.params.fetch)
        : operation.params.headers

    /**
     * These headers are set on this specific request.
     */
    const requestHeaders = operation.params.options?.headers

    const resolvedHeaders = { ...defaultHeaders, ...requestHeaders }

    for (const key in resolvedHeaders) {
      const header = resolvedHeaders[key as never]
      if (header != null) {
        headers.append(key, header)
      }
    }

    // Handle body.

    if (operation.params?.body == null) return

    const rawTransformer = options?.transformer ?? operation.params.transformer

    const transformer = getDataTransformer(rawTransformer)

    // Intermediary variable so TypeScript can coerce the type properly.
    const paramsBody = operation.params.body

    if (paramsBody instanceof FormData) {
      body.append(`${index}.body_type`, 'formdata')

      paramsBody.forEach((value, key) => {
        const serialized = transformer.input.serialize(value)

        // FormData is special and can handle additional data types, like Files.
        // So we will not JSON.stringify the serialized result.
        body.set(`${index}.body.${key}`, serialized)
      })
    } else {
      body.append(`${index}.body_type`, 'json')

      const serialized = transformer.input.serialize(operation.params.body)
      const stringified = JSON.stringify(serialized)

      body.set(`${index}.body`, stringified)
    }
  })

  return { body, query: {}, headers }
}

const generateBatchRequestInformation = {
  GET: generateGetBatchRequestInformation,
  POST: generatePostBatchRequestInformation,
}

/**
 * @see https://trpc.io/docs/client/links/httpLink
 */
export function httpBatchLink<T extends AnyElysia = AnyElysia>(
  options: HTTPBatchLinkOptions<T> = {},
) {
  const maxURLLength = options.maxURLLength ?? Infinity
  const maxItems = options.maxItems ?? Infinity
  const endpoint = options.endpoint ?? BATCH_ENDPOINT

  const batchLoader: BatchLoader<Operation, EdenResponse<any, EdenFetchError>> = {
    validate(batchOps) {
      // If not a GET request, then we don't care about size limits.
      if (options.method !== 'GET') return true

      // Quick calculation.
      if (maxURLLength === Infinity && maxItems === Infinity) return true

      if (batchOps.length > maxItems) return false

      const requestInformation = generateGetBatchRequestInformation(batchOps)

      const searchParams = new URLSearchParams(requestInformation.query)

      const url = `${endpoint}${searchParams.size ? '?' : ''}${searchParams}`

      return url.length <= maxURLLength
    },
    async fetch(batchOps) {
      // If there is only one request, make a regular HTTP request.
      if (batchOps.length === 1) {
        const [firstOperation] = batchOps

        if (firstOperation != null) {
          const result = await handleHttpRequest(options, firstOperation)
          return [result]
        }
      }

      // If any requests are POST, then the entire batch request must be POST.
      // Otherwise, default to user-provided method and fallback to POST.
      const method =
        (batchOps.find((op) => op.params.method === 'POST') && 'POST') || options.method || 'POST'

      const batchInformationGenerator = generateBatchRequestInformation[method]

      const information = batchInformationGenerator(batchOps, options)

      const resolvedParams: EdenRequestParams = {
        ...options,
        method,
        options: { query: information.query },
        body: information.body,
        headers: information.headers,
      }

      const result = await resolveEdenRequest(resolvedParams)

      /**
       * result.data should be an array of JSON data from each request in the batch.
       */
      if (!('data' in result) || !Array.isArray(result.data)) {
        return []
      }

      const resolvedTransformer = getTransformer(options)

      const batchedData: EdenResponse<any, EdenFetchError>[] = result.data

      /**
       * The batch plugin also encodes its data into a JSON.
       *
       * @example
       * If the data from a batched request is [3, 'OK', false],
       * the batch plugin should return a JSON like
       * [
       *   { data: 3, error: null, status: 200, statusText: 'OK' },
       *   { data: 'OK', error: null, status: 200, statusText: 'OK' }
       *   { data: false, error: null, status: 200, statusText: 'OK' }
       * ]
       */
      const transformedResponses = batchedData.map((batchedResult, index) => {
        // The raw data from each request has not be de-serialized yet.
        // De-serialize it so every entry is the finalized result.
        if (resolvedTransformer != null && batchedResult.data != null) {
          batchedResult.data = resolvedTransformer.output.deserialize(batchedResult.data)
        }

        const operation = batchOps[index]

        // If this specific operation wanted the raw information, append the required properties.
        if (operation?.params.raw) {
          // Recreate custom headers object.
          const headers = new Headers()

          /**
           * If the header value has a numeric prefix, only assign it if it matches the operation index,
           * otherwise, assign it.
           *
           * The batch plugin will add a numeric prefix to organize the headers.
           *
           * @example
           * '0.set-cookie': 'abc' should be a header only for request 0.
           * 'set-cookie': should be a header for all the batched requests.
           */
          result.response.headers.forEach((value, key) => {
            const [prefix, name] = key.split('.')

            if (Number(prefix) === index && name != null) {
              headers.set(name, value)
            } else {
              headers.set(key, value)
            }
          })

          /**
           * TODO: how to guarantee that this value is the correct body?
           */
          const body =
            resolvedTransformer != null
              ? resolvedTransformer.output.serialize(batchedResult.data)
              : JSON.stringify(batchedResult.data)

          /**
           * Create a new response using the re-serialized body.
           */
          const response = new Response(body, {
            status: batchedResult.response.status,
            statusText: batchedResult.response.statusText,
            headers,
          })

          batchedResult.response = response
        }

        return batchedResult
      })

      return transformedResponses
    },
  }

  const loader = dataLoader(batchLoader)

  const link = () => {
    const operationLink: OperationLink<T> = ({ op }) => {
      return new Observable((observer) => {
        if (op.type === 'subscription') {
          throw new Error(
            'Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`',
          )
        }

        const promise = loader.load(op)

        promise
          .then((response) => {
            if (response.error) {
              observer.error(response.error)
            } else {
              observer.next({ result: response, context: op.context })
              observer.complete()
            }
          })
          .catch((err) => {
            observer.error(err)
          })
      })
    }

    return operationLink
  }

  return link
}
