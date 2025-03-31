import type { BatchDeserializer } from '../../core/config'
import type { EdenRequestParams } from '../../core/request'
import { resolveTransformers } from '../../core/transform'
import { set } from '../../utils/set'
import { BODY_KEYS,BODY_TYPES, IGNORED_HEADERS } from '../shared'

export const deserializeBatchPostParams: BatchDeserializer = async (context, config) => {
  const request = context.request

  const result: Array<EdenRequestParams & { body_type?: string }> = []

  const globalHeaders: any = {}

  const transformers = resolveTransformers(config.transformers)

  for (const [key, value] of request.headers) {
    const [index, name] = key.split('.')

    if (!index) continue

    if (!name) {
      if (!IGNORED_HEADERS.includes(index.toLowerCase())) {
        globalHeaders[index] = value
      }
      continue
    }

    if (IGNORED_HEADERS.includes(name.toLowerCase())) continue

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

    const paramIndex = Number(index)

    if (Number.isNaN(paramIndex)) continue

    switch (name) {
      case BODY_KEYS.body: {
        const bodyType = formData.get(`${index}.${BODY_KEYS.bodyType}`)

        if (bodyType === BODY_TYPES.FORM_DATA) {
          const body = new FormData()

          const baseKey = `${index}.${BODY_KEYS.body}`

          const bodyEntries = formDataEntries
            .filter((entry) => {
              return (
                entry[0].startsWith(`${index}.${BODY_KEYS.body}`) &&
                !entry[0].startsWith(`${index}.${BODY_KEYS.bodyType}`)
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

        if (bodyType === BODY_TYPES.JSON) {
          const rawBody = formData.get(`${index}.${BODY_KEYS.body}`)

          if (rawBody == null) continue

          let body = JSON.parse(rawBody.toString())

          const filePaths = formData.getAll(`${index}.${BODY_KEYS.filePaths}`)

          const files = formData.getAll(`${index}.${BODY_KEYS.files}`)

          files.forEach((file, index) => {
            const path = filePaths[index]

            if (path == null) return

            set(body, path.toString(), file)
          })

          const transformed = formData.get(`${index}.${BODY_KEYS.transformed}`)

          if (transformed) {
            const transformerId = formData.get(`${index}.${BODY_KEYS.transformerId}`)

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

      case BODY_KEYS.bodyType: {
        // noop because body handles this
        continue
      }

      case BODY_KEYS.method: // falls through

      case BODY_KEYS.path: {
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

  return definedResults
}
