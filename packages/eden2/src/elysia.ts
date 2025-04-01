/**
 * Internally maintained interface representing an Elysia instance.
 */
export interface InternalElysia {
  store?: any
  handle?: (request: Request) => Promise<Response>
}

export interface InternalContext {
  request: Request
}

export interface InternalRouteSchema {
  body?: unknown
  headers?: unknown
  query?: unknown
  params?: unknown
  cookie?: unknown
  response?: unknown
}
