// @ts-check

import { defineConfig } from '@rslib/core'

const config = defineConfig({
  output: {
    cleanDistPath: true,
    distPath: {
      root: 'dist',
    },
    sourceMap: true,
  },
  lib: [
    {
      bundle: true,
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
      dts: true,
      format: 'esm',
    },
    {
      bundle: true,
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
      dts: true,
      format: 'cjs',
    },
    {
      bundle: true,
      source: {
        entry: {
          index: './src/plugins/index.ts',
        },
      },
      output: {
        filename: {
          js: 'plugins.js',
        },
      },
      dts: true,
      format: 'esm',
    },
    {
      bundle: true,
      source: {
        entry: {
          index: './src/plugins/index.ts',
        },
      },
      dts: true,
      format: 'cjs',
      output: {
        filename: {
          js: 'plugins.cjs',
        },
      },
    },
  ],
})

export default config
