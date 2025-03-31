import type { AnyElysia } from 'elysia'

import type { EdenResolverConfig } from '../core/config'
import { type HTTPHeaders, processHeaders } from '../core/headers'
import type { EdenRequestParams } from '../core/request'
import { resolveEdenRequest } from '../core/resolve'
import { Observable } from '../observable'
import type { CallbackOrValue } from '../utils/resolve-callback-or-value'
import { toArray } from '../utils/to-array'
import type { MaybeArray, MaybePromise, Nullish } from '../utils/types'
import type { EdenLink } from './internal/eden-link'
import type { Operation } from './internal/operation'
import type { OperationLink } from './internal/operation-link'

/**
 * HTTP-links basically have the same configuration as the eden resolver because
 * HTTP operations are just wrappers around the core function.
 *
 * The headers vary based on the context; different types of HTTP links can
 * provide different information to a callback.
 *
 * @see https://github.com/trpc/trpc/blob/662da0bb0a2766125e3f7eced3576f05a850a069/packages/client/src/links/internals/httpUtils.ts#L22
 */
export type HTTPLinkBaseOptions<_T> = Omit<EdenResolverConfig, 'headers'>

/**
 * An extremely flexible resolver for HTTP Headers.
 *
 * Can either be the value itself, a promise of the value, a nullish value, or
 * a callback that returns any of the previously mentioned types.
 *
 * In the context of {@link httpLink}, the callback is provided with the current operation.
 */
export type HTTPLinkHeaders = CallbackOrValue<MaybePromise<HTTPHeaders | Nullish>, [Operation]>

/**
 * @template T Configuration
 */
export type HTTPLinkOptions<T> = HTTPLinkBaseOptions<T> & {
  /**
   * Headers to be set on outgoing requests or a callback that of said headers
   * Basically like {@link EdenResolverConfig.headers} but callbacks are provided with the entire operation.
   *
   * @see http://trpc.io/docs/client/headers
   */
  headers?: MaybeArray<CallbackOrValue<MaybePromise<HTTPHeaders | Nullish>, [Operation]>>
}

/**
 * Resolve the request parameters based on the operation.
 * This function will apply any defaults established by the link configuration.
 * The parameters will be resolved further by {@link resolveFetchOptions}, but
 * those will only be with respect to the specific request.
 */
export async function resolveHttpOperationParams(options: HTTPLinkOptions<any>, op: Operation) {
  const { path, params } = op

  const fetch = { ...options.fetch, ...params?.fetch }

  const onRequest = [...toArray(options.onRequest), ...toArray(params?.onRequest)]

  const onResponse = [...toArray(options.onResponse), ...toArray(params?.onResponse)]

  const onResult = [...toArray(options.onResult), ...toArray(params.onResult)]

  const operationHeaders = await processHeaders(options.headers, op)

  const headers = [operationHeaders, ...toArray(params.headers)]

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

export async function handleHttpRequest(options: HTTPLinkOptions<any>, op: Operation) {
  const resolvedParams = await resolveHttpOperationParams(options, op)
  const result = await resolveEdenRequest(resolvedParams)
  return result
}

/**
 * @see https://trpc.io/docs/client/links/httpLink
 */
export function httpLink<T extends AnyElysia = AnyElysia>(options: HTTPLinkOptions<T> = {}) {
  const link = (() => {
    const operationLink = (({ op }) => {
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
    }) satisfies OperationLink<T>

    return operationLink
  }) satisfies EdenLink<T>

  return link
}
