import { type AnyElysia, Elysia } from 'elysia'

import { BATCH_ENDPOINT } from '../constants'
import { resolveEdenRequest } from '../core/resolve'
import { getTransformer } from '../trpc/client/transformer'
import type { DataTransformerOptions } from '../trpc/server/transformer'
import { notNull } from '../utils/null'
import { set } from '../utils/set'
import { toArray } from '../utils/to-array'
import { deserializeBatchGetParams } from './deserializer/get'
import { type BatchPostDeserializerOptions, deserializeBatchPostParams } from './deserializer/post'

export interface BatchPluginOptions extends BatchPostDeserializerOptions {
  endpoint?: string
}

const batchDeserializers = {
  get: deserializeBatchGetParams,
  post: deserializeBatchPostParams,
} as const

export function batchPlugin(options?: BatchPluginOptions) {
  const endpoint = options?.endpoint ?? BATCH_ENDPOINT

  const plugin = <T extends AnyElysia>(elysia: T) => {
    const resolveBatchRequest = async (key: keyof typeof batchDeserializers, request: Request) => {
      const batchParams = await batchDeserializers[key](request, options)

      const url = new URL(request.url)

      const resolvedBatchParams = batchParams.map((params) => {
        const resolvedParams = {
          ...params,
          base: url.origin,
          domain: elysia,
        }
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

      const response = new Response(JSON.stringify(results), { headers })

      return response
    }

    const resolveBatchGetRequest = resolveBatchRequest.bind(null, 'get')
    const resolveBatchPostRequest = resolveBatchRequest.bind(null, 'post')

    const instance = new Elysia()
      .get(endpoint, async (context) => await resolveBatchGetRequest(context.request))
      .post(endpoint, async (context) => await resolveBatchPostRequest(context.request), {
        parse: () => null,
      })

    return elysia.use(instance) as T
  }

  return plugin
}

export interface JsonTransformerPluginOptions {
  transformer: DataTransformerOptions | Array<DataTransformerOptions>
}

export function jsonTransformerPlugin(options: JsonTransformerPluginOptions) {
  const transformers = toArray(options.transformer)
    .map((transformer) => getTransformer({ transformer }))
    .filter(notNull)

  const firstTransformer = transformers[0]

  const plugin = <T extends AnyElysia>(elysia: T) => {
    if (firstTransformer == null) return elysia

    const ely = elysia as Elysia

    ely
      .onParse(async (context) => {
        const transformed = context.request.headers.get('transformed')

        const transformerId = context.request.headers.get('transformer-id')

        if (!transformed && !transformerId) return

        const contentType = context.request.headers.get('content-type')?.split(';')[0]

        const request = context.request

        switch (contentType) {
          case 'multipart/form-data': {
            const formData = await request.clone().formData()

            const body = formData.get('body')

            if (!body) return

            const json = JSON.parse(body.toString())

            const transformer = transformers.find((t) => t.id === transformerId) || firstTransformer

            const deserialized = await transformer.input.deserialize(json)

            const filePaths = formData.getAll('files.path')

            const files = formData.getAll('files.file')

            files.forEach((file, index) => {
              const path = filePaths[index]

              if (path == null) return

              set(deserialized, path.toString(), file)
            })

            return deserialized
          }

          case 'application/json': {
            const json = await request.clone().json()

            const transformer = transformers.find((t) => t.id === transformerId) || firstTransformer

            const deserialized = await transformer.input.deserialize(json)

            return deserialized
          }

          case 'text/plain': {
            const text = await request.clone().text()

            const transformer = transformers.find((t) => t.id === transformerId) || firstTransformer

            const deserialized = await transformer.input.deserialize(text)

            return deserialized
          }

          default: {
            return
          }
        }
      })
      .mapResponse(async (context) => {
        const transformed = context.request.headers.get('transformed')

        const transformerId = context.request.headers.get('transformer-id')

        if (!transformed && !transformerId) return

        if (context.response instanceof Response) return

        const transformer = transformers.find((t) => t.id === transformerId) || firstTransformer

        const serializedResponse = await transformer.output.serialize(context.response)

        const text = JSON.stringify(serializedResponse)

        return new Response(text, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })

    return ely
  }

  return plugin
}
