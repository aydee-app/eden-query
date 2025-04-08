/**
 * Keys in used in the batch body.
 */
export const BODY_KEYS = {
  method: 'method',
  path: 'path',
  body: 'body',
  bodyType: 'body_type',
  query: 'query',
  filePaths: 'files.path',
  files: 'files.files',
  transformed: 'transformed',
  transformerId: 'transformer-id',
} as const

export const BODY_TYPES = {
  JSON: 'json',
  FORM_DATA: 'formdata',
}

/**
 * Temporary fix to ignore these headers from the batch request.
 */
export const IGNORED_HEADERS = ['content-type', 'content-length', 'accept']

export const BATCH_METHODS = ['GET', 'POST'] as const

export type BatchMethod = (typeof BATCH_METHODS)[number]
