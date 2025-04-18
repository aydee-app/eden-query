import { isServer } from '../constants'

export function isFile(value: unknown) {
  if (isServer) return value instanceof Blob
  return value instanceof FileList || value instanceof File
}

export type ExtractedFile = {
  path: string
  file: File
}

export function extractFiles(object?: Record<string, any>, path: string[] = []): ExtractedFile[] {
  const result: ExtractedFile[] = []

  for (const key in object) {
    const value = object[key]

    if (!value) continue

    if (isFile(value)) {
      const extracted: ExtractedFile = { path: [...path, key].join('.'), file: value }

      result.push(extracted)

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
