import { IS_SERVER } from '../constants'

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
      formData.append(key, field)
      continue
    }

    if (field instanceof FileList || Array.isArray(field)) {
      for (const value of field) {
        formData.append(key, value)
      }

      continue
    }

    formData.append(key, field as any)
  }

  return formData
}
