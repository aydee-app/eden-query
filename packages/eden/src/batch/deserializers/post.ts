import type { InternalEdenRequestOptions } from '../../core/config'
import type { InternalContext, InternalElysia, TypeConfig } from '../../core/types'
import { set } from '../../utils/set'
import { BODY_KEYS, BODY_TYPES } from '../shared'
import type { BatchDeserializerConfig } from './config'
import { deserializeBatchGetParams } from './get'

/**
 * Similar logic to the batch request parser implemented by tRPC.
 *
 * @see https://github.com/trpc/trpc/blob/main/packages/server/src/unstable-core-do-not-import/http/contentType.ts#L65
 *
 * @returns Array of options that can each be passed to the Eden request resolver.
 */
export async function deserializeBatchPostParams<
  TElysia extends InternalElysia = InternalElysia,
  TConfig extends TypeConfig = undefined,
>(context: InternalContext, config?: BatchDeserializerConfig) {
  const result = await deserializeBatchGetParams(context, config)

  const request = context.request

  const formData = await request.formData()

  const formDataEntries = [...formData.entries()]

  formDataEntries.forEach(([key, value]) => {
    const [maybeIndex, property = ''] = key.split('.')

    const index = Number(maybeIndex)

    // For now, batching behavior is not configurable from the request itself.
    // In the future, it may be possible to configure the batch request handler
    // from the request body or query via global options.

    if (Number.isNaN(index)) return

    switch (property) {
      case BODY_KEYS.body: {
        const bodyType = formData.get(`${index}.${BODY_KEYS.bodyType}`)

        switch (bodyType) {
          case BODY_TYPES.FORM_DATA: {
            const body = new FormData()

            const bodyKey = `${index}.${BODY_KEYS.body}`

            formDataEntries
              .filter((entry) => entry[0].startsWith(`${bodyKey}.`))
              .map((entry) => [entry[0].slice(bodyKey.length + 1), entry[1]] as const)
              .forEach((entry) => body.append(entry[0], entry[1]))

            result[index] = { ...result[index], body }

            return
          }

          case BODY_TYPES.JSON: // falls through

          default: {
            const body = JSON.parse(value.toString())

            const filePaths = formData.getAll(`${index}.${BODY_KEYS.filePaths}`)

            const files = formData.getAll(`${index}.${BODY_KEYS.files}`)

            files.forEach((file, index) => {
              const path = filePaths[index]

              if (path == null) return

              set(body, path.toString(), file)
            })

            result[index] = { ...result[index], body }

            return
          }
        }
      }

      default: {
        result[index] = { ...result[index], [property]: value }
      }
    }
  })

  return result as Array<InternalEdenRequestOptions<TElysia, TConfig>>
}
