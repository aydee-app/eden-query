import { createEdenTreatySvelteQuery } from '../src'
import type { App } from './app'

export function createEden(...args: Parameters<typeof createEdenTreatySvelteQuery>) {
  return createEdenTreatySvelteQuery<App>(
    {
      domain: 'http://localhost:3001',
      ...args[0],
    },
    args[1] as any,
  )
}

export const eden = createEdenTreatySvelteQuery<App>({
  domain: 'http://localhost:3001',
})
