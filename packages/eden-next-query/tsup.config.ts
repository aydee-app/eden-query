import { defineConfig } from 'tsup'

const config = defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  external: ['react'],
  noExternal: ['@aydee-app/eden-react-query', '@aydee-app/eden'],
  clean: true,
})

export default config
