import { isServer } from '../constants'
import { notNull } from './null'

function isFile(v: any) {
  if (isServer) return v instanceof Blob
  return v instanceof FileList || v instanceof File
}

/**
 * FormData is 1 level deep.
 */
export function hasFile(obj: Record<string, any>) {
  if (!obj) return false

  for (const key in obj) {
    if (isFile(obj[key])) return true
    if (Array.isArray(obj[key]) && obj[key].find(isFile)) return true
  }

  return false
}

export function createNewFile(v: File) {
  if (isServer) return v

  return new Promise<File>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const fileBits = [reader.result].filter(notNull)
      const file = new File(fileBits, v.name, { lastModified: v.lastModified, type: v.type })
      resolve(file)
    }

    reader.readAsArrayBuffer(v)
  })
}
