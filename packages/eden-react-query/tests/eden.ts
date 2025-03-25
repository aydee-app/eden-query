import { createEdenTreatyReactQuery } from '../src'
import type { App } from './app'

export function createEden(...args: Parameters<typeof createEdenTreatyReactQuery>) {
  return createEdenTreatyReactQuery<App>(
    {
      domain: 'http://localhost:3000',
      ...args[0],
    },
    args[1] as any,
  )
}

export const eden = createEdenTreatyReactQuery<App>({
  domain: 'http://localhost:3001',
  abortOnUnmount: true,
})
