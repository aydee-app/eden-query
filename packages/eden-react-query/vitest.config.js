// @ts-check

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const config = defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup.ts'],
  },
})

export default config
