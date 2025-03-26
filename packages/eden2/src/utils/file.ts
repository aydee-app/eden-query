import { isServer } from '../constants'

function isFile(v: any) {
  if (isServer) return v instanceof Blob

  return v instanceof FileList || v instanceof File
}

// FormData is 1 level deep
export function hasFile(obj: Record<string, any>) {
  if (!obj) return false

  for (const key in obj) {
    if (isFile(obj[key])) return true

    if (Array.isArray(obj[key]) && (obj[key] as unknown[]).find(isFile)) return true
  }

  return false
}

export function createNewFile(v: File) {
  if (isServer) return v

  return new Promise<File>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const file = new File([reader.result!], v.name, {
        lastModified: v.lastModified,
        type: v.type,
      })

      resolve(file)
    }

    reader.readAsArrayBuffer(v)
  })
}
