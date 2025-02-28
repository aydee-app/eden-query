import { defineProject } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const project = defineProject({
  test: {
    setupFiles: ['tests/setup.ts'],
    environment: 'jsdom',
  },
  plugins: [svelte()],
})

export default project
