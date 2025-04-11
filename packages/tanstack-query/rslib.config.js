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
  ],
})

export default config
