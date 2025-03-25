// @ts-check

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const config = defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})

export default config
