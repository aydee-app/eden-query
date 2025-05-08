// @ts-check

import { defineConfig } from 'vitest/config'

const config = defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./setup.ts'],
    include: ['**/*.test-d.ts', '**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    coverage: {
      include: ['src/**'],
    },
  },
})

export default config
