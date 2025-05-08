// @ts-check

import adapter from '@sveltejs/adapter-node'

/**
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
  extensions: ['.svelte', '.md'],
  kit: {
    adapter: adapter(),
    alias: {
      $content: '/src/content',
    },
    prerender: {
      handleHttpError: 'warn',
      handleMissingId: 'warn',
      handleEntryGeneratorMismatch: 'warn',
    },
  },
  preprocess: [],
}

export default config
