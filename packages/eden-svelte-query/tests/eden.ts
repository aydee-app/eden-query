import { createEdenTreatySvelteQuery } from '../src'
import type { App } from './app'

export const eden = createEdenTreatySvelteQuery<App>({
  domain: 'http://localhost:3001',
})
