export const isServer = typeof FileList === 'undefined'

export const GET_OR_HEAD_HTTP_METHODS = ['GET', 'HEAD', 'SUBSCRIBE'] as const

/**
 * @see https://github.com/elysiajs/eden/blob/7b4e3d90f9f69bc79ca108da4f514ee845c7d9d2/src/treaty2/index.ts#L11C1-L21C11
 */
export const HTTP_METHODS = [
  ...GET_OR_HEAD_HTTP_METHODS,
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'CONNECT',
] as const

export type GetOrHeadHttpMethod = (typeof GET_OR_HEAD_HTTP_METHODS)[number]

export type HTTPMethod = (typeof HTTP_METHODS)[number]

export const LOOPBACK_ADDRESSES = ['localhost', '127.0.0.1', '0.0.0.0']

export const IS_SERVER = typeof FileList === 'undefined'

export const CLIENT_WARNING =
  'Elysia instance server found on client side, this is not recommended for security reason. Use generic type instead.'

export const DEMO_DOMAIN = 'http://e.ly'

export const ISO8601_REGEX =
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/

export const FORMAL_DATE_REGEX =
  /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2}\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT(?:\+|-)\d{4}\s\([^)]+\)/

export const SHORTENED_DATE_REGEX =
  /^(?:(?:(?:(?:0?[1-9]|[12][0-9]|3[01])[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:19|20)\d{2})|(?:(?:19|20)\d{2}[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:0?[1-9]|[12][0-9]|3[01]))))(?:\s(?:1[012]|0?[1-9]):[0-5][0-9](?::[0-5][0-9])?(?:\s[AP]M)?)?$/

export const BATCH_ENDPOINT = '/batch'

export const WS_ENDPOINT = '/ws'

export const HTTP_SUBSCRIPTION_ERROR =
  'Subscriptions are unsupported by `httpLink` - use `httpSubscriptionLink` or `wsLink`'

/**
 * The default key that's used to store eden-related configuration within the
 * Elysia.js server application.
 *
 * @example
 *
 * ```ts
 * const edenPlugin = new Elysia().state(EDEN_STATE_KEY, {
 *   transformer: { ... },
 *   batch: true,
 * })
 * ```
 */
export const EDEN_STATE_KEY = 'eden' as const
