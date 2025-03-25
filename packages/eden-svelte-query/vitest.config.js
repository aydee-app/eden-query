// @ts-check

import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'

const project = defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    environment: 'happy-dom',
  },
  plugins: [svelte(), svelteTesting()],
})

export default project
