import { parseStringifiedValue } from '../utils/parse'
import type { ResponseEsque } from './http'

export async function* streamResponse(response: ResponseEsque) {
  const body = response.body

  if (!body?.getReader) return

  const reader = body.getReader()

  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const data = decoder.decode(value)

      yield parseStringifiedValue(data)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 */
export async function getResponseData(response?: Response) {
  switch (response?.headers.get('Content-Type')?.split(';')[0]) {
    case 'text/event-stream': {
      return streamResponse(response)
    }

    case 'application/json': {
      return await response.json()
    }

    case 'application/octet-stream': {
      return await response.arrayBuffer()
    }

    case 'multipart/form-data': {
      const formData = await response.formData()
      return Object.fromEntries(formData.entries())
    }

    default: {
      return await response?.text().then(parseStringifiedValue)
    }
  }
}
