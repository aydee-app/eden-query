// @ts-check

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const config = defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test-d.ts', '**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    environment: 'happy-dom',
    globals: true,
  },
})

export default config
