import type { AnyElysia, MaybeArray } from 'elysia'

import type { EdenResolverConfig } from '../core/config'
import type { EdenRequestHeaders, HTTPHeaders } from '../core/headers'
import type { EdenRequestParams } from '../core/request'
import { resolveEdenRequest } from '../core/resolve'
import { Observable } from '../observable'
import { type TransformerOptions } from '../trpc/client/transformer'
import { toArray } from '../utils/to-array'
import type { MaybePromise, Nullish } from '../utils/types'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

export type HTTPLinkBaseOptions<T> = Omit<EdenResolverConfig, 'headers'> & TransformerOptions<T>

export type HTTPHeadersResolver = (operation: Operation) => MaybePromise<HTTPHeaders | Nullish>

export type HTTPLinkHeaders = MaybeArray<HTTPHeaders | HTTPHeadersResolver>

export type HTTPLinkOptions<T = any> = HTTPLinkBaseOptions<T> & {
  /**
   * Headers to be set on outgoing requests or a callback that of said headers
   * @see http://trpc.io/docs/client/headers
   *
   * Headers set at the link level can be resolver functions that receive the entire operation.
   * Headers set at the request level can be resolver functions that receive the request params.
   */
  headers?: HTTPLinkHeaders
}

export function resolveHttpOperationParams(options: HTTPLinkOptions, op: Operation) {
  const { path, params } = op

  const operationHeadersResolver: EdenRequestHeaders = async () => {
    const resolvedHeaders: HTTPHeaders = {}

    const optionHeaders = toArray(options.headers)

    for (const header of optionHeaders) {
      const headersIterable = typeof header === 'function' ? await header(op) : header

      if (!headersIterable) continue

      for (const key in headersIterable) {
        resolvedHeaders[key] = headersIterable[key as keyof typeof headersIterable]
      }
    }

    return resolvedHeaders
  }

  const headers = toArray(params?.headers)

  headers.unshift(operationHeadersResolver as any)

  const fetch = { ...options.fetch, ...params?.fetch }

  const onRequest = [...toArray(options.onRequest), ...toArray(params?.onRequest)]

  const onResponse = [...toArray(options.onResponse), ...toArray(params?.onResponse)]

  const onResult = [...toArray(options.onResult), ...toArray(params.onResult)]

  const resolvedParams = {
    path,
    ...options,
    ...params,
    fetch,
    onRequest,
    onResponse,
    onResult,
    headers,
  } satisfies EdenRequestParams

  return resolvedParams
}

export async function handleHttpRequest(options: HTTPLinkOptions, op: Operation) {
  const resolvedParams = resolveHttpOperationParams(options, op)

  const result = await resolveEdenRequest(resolvedParams)

  return result
}

/**
 * @see https://trpc.io/docs/client/links/httpLink
 */
export function httpLink<T extends AnyElysia = AnyElysia>(options: HTTPLinkOptions<T> = {}) {
  const link = () => {
    const operationLink: OperationLink<T> = ({ op }) => {
      if (op.type === 'subscription') {
        throw new Error(
          'Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`',
        )
      }

      return new Observable((observer) => {
        const request = handleHttpRequest(options, op)

        request
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
