import { Elysia } from 'elysia'

import { deserializeBatchGetParams } from '../batch/deserializer/get'
import { deserializeBatchPostParams } from '../batch/deserializer/post'
import type { BatchMethod } from '../batch/shared'
import { BATCH_ENDPOINT, EDEN_STATE_KEY } from '../constants'
import type { BatchDeserializer, BatchPluginConfig } from '../core/config'
import { resolveEdenRequest } from '../core/resolve'
import type { InternalContext, InternalElysia } from '../elysia'
import { toArray } from '../utils/to-array'
import type { Falsy } from '../utils/types'

export const batchDeserializers = {
  GET: deserializeBatchGetParams,
  POST: deserializeBatchPostParams,
} satisfies Record<BatchMethod, BatchDeserializer>

/**
 * A low-level function for manually creating the resolvers. This uses internal type definitions
 * that will be more stable and simple than upstream types. Please note that some options
 * are not actually used in this version. e.g. {@link BatchPluginConfig.endpoint} would not
 * do anything since you are responsible for registering the routes.
 *
 * ```ts
 * new Elysia().use((app) => {
 *   const batchConfig = {}
 *
 *   const resolvers = createBatchResolvers(app, batchConfig)
 *
 *   return app
 *     .get('/batch', resolvers.GET)
 *     .post('/batch', resolvers.BATCH, { parse: () => null })
 * })
 * ```
 */
export function createBatchResolvers(domain: InternalElysia, config: BatchPluginConfig = {}) {
  const resolveBatchRequest = async (method: BatchMethod, context: InternalContext) => {
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

  return {
    GET: resolveBatchRequest.bind(null, 'GET'),
    POST: resolveBatchRequest.bind(null, 'POST'),
  }
}

/**
 */
export function batchPlugin<T extends BatchPluginConfig>(config: T = {} as any) {
  type TResolvedKey = T['key'] extends Falsy
    ? never
    : T['key'] extends true
      ? typeof EDEN_STATE_KEY
      : T['key'] extends PropertyKey
        ? T['key']
        : never

  const endpoint = config?.endpoint ?? BATCH_ENDPOINT

  const key = config.key ?? EDEN_STATE_KEY

  /**
   * @todo
   * Decide whether it is worth it to return an instance with strongly-typed batch routes.
   * For now, the returned application does not contain the registered routes since
   * the batch methods are not intended to be invoked directly...
   */
  const plugin = (app: Elysia) => {
    const resolvers = createBatchResolvers(app, config)

    const methods = toArray(config.method)

    if (!methods.length) {
      methods.push('POST')
    }

    if (methods.includes('GET')) {
      app.get(endpoint, resolvers.GET)
    }

    if (methods.includes('POST')) {
      app.post(endpoint, resolvers.POST, { parse: () => null })
    }

    const appWithState = app.state((state) => {
      type TResolvedState = typeof state & { [K in TResolvedKey]: T & { batch: true } }
      const eden = { batch: config }
      const result = { ...state, [key.toString()]: eden }
      return result as TResolvedState
    })

    return appWithState
  }

  return plugin
}
