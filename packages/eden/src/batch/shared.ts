/**
 * Keys used to identify batch options in the request body or query.
 */
export const BODY_KEYS = {
  /**
   * The path or endpoint of the request.
   *
   * Location:
   *   GET -> query, URLSearchParams.
   *   POST -> request body, FormData.
   *
   * @example
   *
   * // POST batch request.
   *
   * const body = new FormData()
   *
   * body.append('0.path', '/api/posts')
   *
   * // GET batch request.
   * const query = new URLSearchParams({ '0.path': '/api/posts' })
   */
  path: 'path',

  /**
   * The HTTP method of the request.
   *
   * Location:
   *   GET -> query, URLSearchParams.
   *   POST -> request body, FormData.
   *
   * @example
   *
   * // POST batch request.
   *
   * const body = new FormData()
   *
   * body.append('0.method', 'PATCH')
   *
   * // GET batch request.
   * const query = new URLSearchParams({ '0.method': 'PATCH' })
   */
  method: 'method',

  /**
   * The request body, i.e. available for any non-GET requests.
   *
   * @example
   *
   * // POST batch request.
   *
   * const body = new FormData()
   *
   * body.append('0.body', { "json": "value" })
   */
  body: 'body',

  /**
   * The type of request body. This batch specification allows you to embed FormData within a batch request.
   *
   * Location:
   *   GET -> never.
   *   POST -> request body, FormData.
   *
   * @example
   *
   * // POST batch request.
   *
   * const body = new FormData()
   *
   * const body0 = new FormData()
   *
   * body0.append('my-file', new File([], 'my-file-name'))
   *
   * body.append('0.body_type', 'formdata')
   *
   * for (const [key, value] of body0) body.append(`0.body.${key}`, value)
   */
  bodyType: 'body_type',

  /**
   * For GET batch requests, individual queries will be stored in the URL.
   * For POST batch requests, the full request path with query string will be stored in the request body.
   *
   * Location:
   *   GET -> query.
   *   POST -> never, included with the request path.
   *
   * @example
   *
   * const query = new URLSearchParams()
   *
   * query.append('0.query.key', 'value')
   */
  query: 'query',

  /**
   * Eden allows uploading files within JSON. To do so, all files are removed from the JSON object
   * and stored within the POST request FormData body. The original JSON without files is also attached.
   *
   * Location:
   *   GET -> never.
   *   POST -> request body, FormData.
   *
   * @example
   *
   * const json = { elysia: 'aponia', my: { nested: { file: new File([], 'my-file-name') } } }
   *
   * const body = new FormData()
   *
   * const extractedFiles = [
   *   {
   *     path: 'my.nested.file',
   *     file: json.my.nested.file
   *   }
   * ]
   *
   * const jsonWithoutFiles = { elysia: 'aponia' }
   *
   * body.append('0.body', JSON.stringify(jsonWithoutFiles))
   *
   * for (const file of extractedFiles) {
   *   body.append('0.files.path', extractedFiles.path)
   *   body.append('0.files.files', extractedFiles.file)
   * }
   *
   * // On the server, the JSON is reconstructed.
   *
   * const formData = await request.formData()
   *
   * const jsonString = formData.get('0.body')
   *
   * const json = JSON.parse(jsonString)
   *
   * const filePaths = formData.getAll('0.files.path')
   * const files = formData.getAll('0.files.files')
   *
   * for (let i = 0; i < filePaths.length && i < files.length; i++) {
   *   deepSet(json, filePaths[i], files[i])
   * }
   */
  filePaths: 'files.path',

  /**
   * Files sent with a JSON object.
   *
   * Location:
   *   GET -> never.
   *   POST -> request body, FormData.
   *
   * @see {@link BODY_KEYS.filePaths}
   */
  files: 'files.files',

  /**
   * Whether the server should use a transformer for the request.
   *
   * This is required if EITHER the request has serialized input OR the response should be serialized.
   *
   * e.g., the request expects JSON serialized with SuperJSON, the endpoint expects a BigInt serialized with SuperJSON, etc.
   *
   * Location:
   *   GET -> request headers.
   *   POST -> request headers.
   */
  transformed: 'transformed',

  /**
   * A specific transformer ID for the request.
   * Only used if both the server and client support multiple transformers.
   *
   * Derived from a provided object or array mapping, the designated transformer ID is used to select a concrete serializer on the server.
   *
   * Location:
   *   GET -> request headers.
   *   POST -> request headers.
   */
  transformerId: 'transformer-id',
} as const

/**
 */
export const BODY_TYPES = {
  JSON: 'json',
  FORM_DATA: 'formdata',
  RAW: 'raw',
}

/**
 * Headers to not forward from the batch request to child requets.
 */
export const IGNORED_HEADERS = ['content-type', 'content-length', 'accept', 'transfer-encoding']
