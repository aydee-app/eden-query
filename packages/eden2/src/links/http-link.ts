import type { AnyElysia } from 'elysia'
import type { HTTPHeaders } from '../core/headers'
import type { EdenLink } from './internal/eden-link'
import { Observable } from './internal/observable'
import type { OperationLink } from './internal/operation-link'
import { getTransformer } from '../core/transformer'
import { resolveEdenRequest } from '../core/resolve'
import type { EdenRequestParams } from '../core/request'
import type { Operation } from './internal/operation'

export type HTTPLinkOptions<T extends AnyClientTypes> = HTTPLinkBaseOptions<T> & {
  /**
   * Headers to be set on outgoing requests or a callback that of said headers
   * @see http://trpc.io/docs/client/headers
   */
  headers?: HTTPHeaders | ((opts: { op: Operation }) => HTTPHeaders | Promise<HTTPHeaders>)
}

/**
 * @see https://trpc.io/docs/client/links/httpLink
 */
export function httpLink<T extends AnyElysia = AnyElysia>(
  options: HTTPLinkOptions<T>,
): EdenLink<T> {
  // const resolvedOptions = {
  //   url: options.url.toString(),
  //   fetch: options.fetch,
  //   transformer: getTransformer(options.transformer),
  //   methodOverride: options.methodOverride,
  // }

  const link: EdenLink<T> = () => {
    const operationLink: OperationLink<T> = ({ op }) => {
      return new Observable((observer) => {
        const { path, params, type } = op

        if (type === 'subscription') {
          throw new Error(
            'Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`',
          )
        }

        const resolvedParams: EdenRequestParams = {
          path,
          ...params,
          headers() {
            if (!options.headers) {
              return {}
            }

            if (typeof options.headers === 'function') {
              return options.headers({ op })
            }

            return options.headers
          },
        }

        const request = resolveEdenRequest(resolvedParams)

        request
          .then((response) => {
            if (response.error) {
              observer.error(response.error)
            } else {
              observer.next({
                result: {},
              })
              observer.complete()
            }
          })
          .catch((err) => {
            observer.error(err)
          })

        // universalRequester({
        //   ...resolvedOptions,
        //   type,
        //   path,
        //   params,
        //   signal: op.signal,
        //   headers() {
        //     if (!options.headers) {
        //       return {}
        //     }

        //     if (typeof options.headers === 'function') {
        //       return options.headers({ op })
        //     }

        //     return options.headers
        //   },
        // })
      })
    }

    return operationLink
  }

  return link
}
