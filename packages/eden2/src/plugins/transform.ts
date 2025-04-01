import { Elysia } from 'elysia'
import { ElysiaCustomStatusResponse } from 'elysia/error'

import { EDEN_STATE_KEY } from '../constants'
import type { TransformerPluginConfig } from '../core/config'
import { resolveTransformers } from '../core/transform'
import { set } from '../utils/set'
import type { Falsy } from '../utils/types'

export function transformPlugin<const T extends TransformerPluginConfig>(config: T = {} as any) {
  type TResolvedKey = T['key'] extends Falsy
    ? never
    : T['key'] extends true
      ? typeof EDEN_STATE_KEY
      : T['key'] extends PropertyKey
        ? T['key']
        : never

  const key = config.key ?? EDEN_STATE_KEY

  const transformers = resolveTransformers(config.transformer ?? config.transformers)

  const firstTransformer = transformers[0]

  /**
   * @todo Decide whether it is worth it to return an instance with strongly-typed batch routes.
   */
  const plugin = (app: Elysia) => {
    const appWithState = app.state((state) => {
      type TResolvedState = typeof state & { [K in TResolvedKey]: T }
      const eden = { transform: config }
      const result = { ...state, [key.toString()]: eden }
      return result as TResolvedState
    })

    if (firstTransformer == null) return appWithState

    return appWithState
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

        if (context.response instanceof ElysiaCustomStatusResponse) {
          const serializedResponse = await transformer.output.serialize(context.response.response)

          const text = JSON.stringify(serializedResponse)

          return new Response(text, {
            status: context.response.code,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        }

        const serializedResponse = await transformer.output.serialize(context.response)

        const text = JSON.stringify(serializedResponse)

        return new Response(text, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })
  }

  return plugin
}
