import type { EdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import { set } from '../../utils/set'
import { BODY_KEYS, BODY_TYPES, IGNORED_HEADERS } from '../shared'
import type { BatchDeserializerConfig } from './config'

export async function deserializeBatchPostParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(context: InternalContext, _config?: BatchDeserializerConfig) {
  const request = context.request

  const result: Array<EdenRequestOptions & { body_type?: string }> = []

  const globalHeaders: any = {}

  for (const [key, value] of request.headers) {
    const [indexOrName = '', ...name] = key.split('.')

    const fullName = name.join('.')

    if (!fullName) {
      globalHeaders[indexOrName] = value
      continue
    }

    if (IGNORED_HEADERS.includes(fullName.toLowerCase())) continue

    const index = Number(indexOrName)

    if (Number.isNaN(index)) continue

    result[index] ??= {}
    result[index].input ??= {}
    result[index].input.headers ??= {}
    ;(result[index].input.headers as any)[fullName] = value
  }

  const formData = await request.formData()

  const formDataEntries = formData.entries().toArray()

  for (const [key, value] of formDataEntries) {
    const [indexOrName = '', ...name] = key.split('.')

    const index = Number(indexOrName)

    if (Number.isNaN(index)) continue

    const property = name[0]

    // What to do with rest of name...

    switch (property) {
      case BODY_KEYS.body: {
        const bodyType = formData.get(`${indexOrName}.${BODY_KEYS.bodyType}`)

        if (bodyType === BODY_TYPES.FORM_DATA) {
          const body = new FormData()

          const bodyKey = `${indexOrName}.${BODY_KEYS.body}`

          const bodyEntries = formDataEntries
            .filter((entry) => entry[0].startsWith(`${bodyKey}.`))
            .map((entry) => [entry[0].slice(bodyKey.length + 1), entry[1]] as const)

          for (const entry of bodyEntries) {
            body.append(entry[0], entry[1])
          }

          result[index] ??= {}
          result[index].body = body

          continue
        }

        if (bodyType === BODY_TYPES.JSON) {
          const body = JSON.parse(value.toString())

          const filePaths = formData.getAll(`${indexOrName}.${BODY_KEYS.filePaths}`)

          const files = formData.getAll(`${indexOrName}.${BODY_KEYS.files}`)

          files.forEach((file, index) => {
            const path = filePaths[index]

            if (path == null) return

            set(body, path.toString(), file)
          })

          result[index] ??= {}
          result[index].body = body
        }

        continue
      }

      case BODY_KEYS.bodyType: // falls through

      case BODY_KEYS.method: // falls through

      case BODY_KEYS.path: {
        result[index] ??= {}
        result[index][property] = value.toString()
        continue
      }

      default:
        continue
    }
  }

  const definedResults = result.filter(Boolean)

  for (const key in globalHeaders) {
    if (IGNORED_HEADERS.includes(key.toLowerCase())) continue

    for (const result of definedResults) {
      result.headers ??= {}
      ;(result.headers as any)[key] = globalHeaders[key]
    }
  }

  return definedResults as Array<EdenRequestOptions<TElysia, TConfig> & { body_type?: string }>
}
