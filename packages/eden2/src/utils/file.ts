import { isServer } from '../constants'
import { notNull } from './null'

export function isFile(value: unknown) {
  if (isServer) return value instanceof Blob
  return value instanceof FileList || value instanceof File
}

/**
 * FormData is 1 level deep.
 */
export function hasFile(object: Record<string, any>) {
  if (!object) return false

  for (const key in object) {
    if (isFile(object[key])) return true
    if (Array.isArray(object[key]) && object[key].find(isFile)) return true
  }

  return false
}

export function createNewFile(value: File) {
  if (isServer) return value

  return new Promise<File>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const fileBits = [reader.result].filter(notNull)
      const file = new File(fileBits, value.name, {
        lastModified: value.lastModified,
        type: value.type,
      })
      resolve(file)
    }

    reader.readAsArrayBuffer(value)
  })
}

export type ExtractedFile = {
  path: string
  file: File
}

export function extractFiles(object: Record<string, any>, path: string[] = []): ExtractedFile[] {
  const result: ExtractedFile[] = []

  for (const key in object) {
    const value = object[key]

    if (!value) continue

    if (isFile(value)) {
      const extracted: ExtractedFile = { path: [...path, key].join('.'), file: value }

      result.push(extracted)

      delete object[key]

      continue
    }

    if (typeof value === 'object') {
      const recursivelyExtractedFiles = extractFiles(value, [...path, key])
      result.push(...recursivelyExtractedFiles)
      continue
    }
  }

  return result
}
