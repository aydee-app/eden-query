// @ts-check

import { defineProject } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'

const project = defineProject({
  test: {
    setupFiles: ['tests/setup.ts'],
    environment: 'jsdom',
  },
  plugins: [svelte(), svelteTesting()],
})

export default project
