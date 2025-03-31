import { type Context, Elysia } from 'elysia'

import { deserializeBatchGetParams } from '../batch/deserializer/get'
import { deserializeBatchPostParams } from '../batch/deserializer/post'
import { BATCH_ENDPOINT, EDEN_STATE_KEY } from '../constants'
import type { BatchConfig, BatchDeserializer, BatchMethod } from '../core/config'
import { resolveEdenRequest } from '../core/resolve'
import { toArray } from '../utils/to-array'

export const batchDeserializers = {
  GET: deserializeBatchGetParams,
  POST: deserializeBatchPostParams,
} satisfies Record<BatchMethod, BatchDeserializer>

/**
 */
export function batchPlugin<const T extends BatchConfig>(config: T = {} as any) {
  type TResolvedKey = T['key'] extends PropertyKey ? T['key'] : typeof EDEN_STATE_KEY

  const endpoint = config?.endpoint ?? BATCH_ENDPOINT

  const key = config.key ?? EDEN_STATE_KEY

  const resolveBatchRequest = async (method: BatchMethod, domain: Elysia, context: Context) => {
    const url = new URL(context.request.url)

    const base = url.origin

    const deserializer = config?.deserializer ?? batchDeserializers[method]

    const batchParams = await deserializer(context, config)

    const resolvedBatchParams = batchParams.map((params) => {
      const resolvedParams = { ...params, base, domain }
      return resolvedParams
    })

    const batchOperations = resolvedBatchParams.map(async (params) => {
      const response = await resolveEdenRequest(params)
      return response
    })

    const results = await Promise.all(batchOperations)

    const headers = new Headers()

    for (const result of results) {
      for (const [key, value] of result.response.headers) {
        headers.append(key, value)
      }
    }

    headers.set('content-type', 'application/json')

    const body = JSON.stringify(results)

    const response = new Response(body, { headers })

    return response
  }

  /**
   * @todo Decide whether it is worth it to return an instance with strongly-typed batch routes.
   */
  const plugin = (app: Elysia) => {
    const resolveBatchGetRequest = resolveBatchRequest.bind(null, 'GET', app)
    const resolveBatchPostRequest = resolveBatchRequest.bind(null, 'POST', app)

    const methods = toArray(config.method)

    if (!methods.length) {
      methods.push('POST')
    }

    // Do not return the application typed with the batch methods, since they're not intended to be invoked directly...

    if (methods.includes('GET')) {
      app.get(endpoint, resolveBatchGetRequest)
    }

    if (methods.includes('POST')) {
      app.post(endpoint, resolveBatchPostRequest, { parse: () => null })
    }

    const appWithState = app.state((state) => {
      type TResolvedState = typeof state & { [K in TResolvedKey]: T }
      const eden = { batch: config }
      const result = { ...state, [key]: eden }
      return result as TResolvedState
    })

    return appWithState
  }

  return plugin
}
