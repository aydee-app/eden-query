import type { EdenRequestParams } from '../../core/request'
import { getTransformer } from '../../trpc/client/transformer'
import type { DataTransformerOptions } from '../../trpc/server/transformer'
import { notNull } from '../../utils/null'
import { set } from '../../utils/set'
import { toArray } from '../../utils/to-array'

export interface BatchPostDeserializerOptions {
  transformer?: DataTransformerOptions | Array<DataTransformerOptions>
}

/**
 * Temporary fix to ignore these headers from the batch request.
 */
const ignoreHeaders = ['content-type', 'content-length']

export async function deserializeBatchPostParams(
  request: Request,
  options?: BatchPostDeserializerOptions,
) {
  const transformers = toArray(options?.transformer)
    .map((transformer) => getTransformer({ transformer }))
    .filter(notNull)

  const result: Array<EdenRequestParams & { body_type?: string }> = []

  const globalHeaders: any = {}

  const globalQuery: any = {}

  for (const [key, value] of request.headers) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      if (!ignoreHeaders.includes(index.toLowerCase())) {
        globalHeaders[index] = value
      }
      continue
    }

    if (ignoreHeaders.includes(name.toLowerCase())) continue

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    result[paramIndex] ??= {}
    result[paramIndex].headers ??= {}
    ;(result[paramIndex].headers as any)[name] = value
  }

  const formData = await request.formData()

  const formDataEntries = formData.entries().toArray()

  for (const [key, value] of formDataEntries) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      globalQuery[index] = value
      continue
    }

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    switch (name) {
      case 'query': {
        result[paramIndex] ??= {}
        result[paramIndex].options ??= {}
        result[paramIndex].options.query ??= {}
        ;(result[paramIndex].options.query as any)[name] = value

        continue
      }

      case 'body': {
        const bodyType = formData.get(`${index}.body_type`)

        if (bodyType === 'formdata') {
          const body = new FormData()

          const baseKey = `${index}.body`

          const bodyEntries = formDataEntries
            .filter((entry) => {
              return (
                entry[0].startsWith(`${index}.body`) && !entry[0].startsWith(`${index}.body_type`)
              )
            })
            .map((entry) => {
              const relativeKey = entry[0].slice(baseKey.length + 1)
              return [relativeKey, entry[1]] as const
            })

          for (const entry of bodyEntries) {
            body.append(entry[0], entry[1])
          }

          result[paramIndex] ??= {}
          result[paramIndex].body = body

          continue
        }

        if (bodyType === 'json') {
          const rawBody = formData.get(`${index}.body`)

          if (rawBody == null) continue

          let body = JSON.parse(rawBody.toString())

          const filePaths = formData.getAll(`${index}.files.path`)

          const files = formData.getAll(`${index}.files.file`)

          files.forEach((file, index) => {
            const path = filePaths[index]

            if (path == null) return

            set(body, path.toString(), file)
          })

          const transformed = formData.get(`${index}.transformed`)

          if (transformed) {
            const transformerId = formData.get(`${index}.transformer-id`)

            const transformer =
              transformers.find((transformer) => transformer.id === transformerId) ||
              transformers[0]

            if (transformer) {
              body = transformer.input.deserialize(body)
            }
          }

          result[paramIndex] ??= {}
          result[paramIndex].body = body
        }

        continue
      }

      case 'body_type': {
        // noop because body handles this
        continue
      }

      case 'method': // falls through

      case 'path': {
        result[paramIndex] ??= {}
        result[paramIndex][name] = value.toString()

        continue
      }

      default: {
        // noop
      }
    }
  }

  const definedResults = result.filter(Boolean)

  for (const key in globalHeaders) {
    for (const result of definedResults) {
      result.headers ??= {}
      ;(result.headers as any)[key] = globalHeaders[key]
    }
  }

  for (const key in globalQuery) {
    for (const result of definedResults) {
      result.options ??= {}
      result.options.query ??= {}
      ;(result.options.query as any)[key] = globalQuery[key]
    }
  }

  return definedResults
}
