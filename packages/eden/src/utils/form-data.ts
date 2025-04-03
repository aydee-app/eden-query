import { IS_SERVER } from '../constants'
import { createNewFile } from './file'

export async function jsonToFormData(body: unknown) {
  const formData = new FormData()

  if (body == null || typeof body !== 'object') return formData

  // FormData is 1 level deep
  for (const [key, field] of Object.entries(body)) {
    if (IS_SERVER) {
      formData.append(key, field as any)
      continue
    }

    if (field instanceof File) {
      formData.append(key, await createNewFile(field))
      continue
    }

    if (field instanceof FileList || Array.isArray(field)) {
      for (const value of field) {
        const formValue = value instanceof File ? await createNewFile(value) : value
        formData.append(key, formValue)
      }

      continue
    }

    formData.append(key, field as any)
  }

  return formData
}
