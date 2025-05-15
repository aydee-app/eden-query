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
  source: {
    tsconfigPath: './tsconfig.build.json',
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
      autoExternal: {
        devDependencies: false,
      },
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
      autoExternal: {
        devDependencies: false,
      },
    },
  ],
})

export default config
