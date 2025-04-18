import { edenFetchTanstackQuery } from './fetch'
import { edenTreatyTanstackQuery } from './treaty'

export const eden = { fetch: edenFetchTanstackQuery, treaty: edenTreatyTanstackQuery }

export { edenFetchTanstackQuery as fetch, edenTreatyTanstackQuery as treaty }

export * from './fetch'
export * from './shared'
export * from './treaty'

export default eden
