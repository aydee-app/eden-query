// @ts-check

import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import react from '@vitejs/plugin-react-swc'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

const config = defineConfig({
  plugins: [
    react(),
    svelte(),
    svelteTesting(),
    solid({ include: 'tests/solid/**/*.tsx' }),
    vue(),
    vueJsx({ include: 'tests/vue/**/*.tsx' }),
  ],
  test: {
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test-d.ts', '**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    environment: 'happy-dom',
    globals: true,
  },
})

export default config
