// @ts-check

import path from 'node:path'

import ci from 'ci-info'
import { defineConfig } from 'rspress/config'
import { ModuleResolutionKind } from 'typescript'

import { rspressPluginTwoslash } from '@ap0nia/rspress-plugin-twoslash'
import { createFileSystemTypesCache } from '@ap0nia/rspress-plugin-twoslash/cache-fs'
import { pluginShiki } from '@rspress/plugin-shiki'

import { repository } from '../package.json'

const repositoryName = repository.url.split('/').pop() ?? ''

const base = true ? `/bruh/` : ''

const description =
  'Ergonomic Framework for Humans. TypeScript framework supercharged by Bun with End - to - End Type Safety, unified type system and outstanding developer experience'

const config = defineConfig({
  // lang: 'en-US',
  title: 'Elysia.js',
  icon: '/assets/elysia.png',
  logo: '/assets/elysia.svg',
  logoText: 'Elysia.js',
  search: {
    mode: 'local',
  },
  base,
  root: 'docs',
  outDir: 'build',
  globalStyles: path.join(__dirname, 'styles/index.css'),
  plugins: [
    rspressPluginTwoslash({
      typesCache: createFileSystemTypesCache({ dir: '.twoslash' }),
      twoslashOptions: {
        compilerOptions: {
          moduleResolution: ModuleResolutionKind.Bundler,
        },
        customTags: ['annotate', 'log', 'warn', 'error'],
      },
    }),
    pluginShiki(),
  ],
  builderConfig: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
  head: [
    [
      'meta',
      {
        name: 'viewport',
        content: 'width=device-width,initial-scale=1,user-scalable=no',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        href: '/assets/elysia.png',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://elysiajs.com/assets/cover.jpg',
      },
    ],
    [
      'meta',
      {
        property: 'og:image:width',
        content: '1920',
      },
    ],
    [
      'meta',
      {
        property: 'og:image:height',
        content: '1080',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:image',
        content: 'https://elysiajs.com/assets/cover.jpg',
      },
    ],
    [
      'meta',
      {
        property: 'og:title',
        content: 'ElysiaJS',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content: description,
      },
    ],
  ],
  themeConfig: {
    lastUpdated: true,
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/ap0nia/eden-query' },
      { icon: 'X', mode: 'link', content: 'https://twitter.com/elysiajs' },
      { icon: 'discord', mode: 'link', content: 'https://discord.gg/eaFJ2KDJck' },
    ],
  },
})

export default config
