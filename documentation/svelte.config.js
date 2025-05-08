// @ts-check

/**
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('unified').Transformer<HastRoot, HastRoot>} HastTransformer
 * @typedef {import('unified').Transformer<MdastRoot, MdastRoot>} MdastTransformer
 */

// import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import ts from 'typescript'
import { visit } from 'unist-util-visit'

import shikiRehype from '@shikijs/rehype'
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
  transformerNotationFocus,
  transformerNotationErrorLevel,
  transformerRenderWhitespace,
  transformerMetaHighlight,
  // transformerMetaWordHighlight,
} from '@shikijs/transformers'
import { transformerTwoslash } from '@shikijs/twoslash'
import adapter from '@sveltejs/adapter-node'

import { mdsxPreprocess } from './src/lib/mdsx/index.js'
import { createTwoslasher } from './src/lib/mdsx/twoslash-svelte.js'
import { parseMetaString } from './src/lib/mdsx/utils/meta.js'
import { rendererFloatingSvelte } from './src/lib/mdsx/floating-renderer-svelte.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const projectRoot = path.resolve(__dirname, '..', '..')

const rootNodeModules = path.join(projectRoot, 'node_modules')

const relativeBlueprintPath = path.join('src', 'lib', 'markdown', 'blueprint', 'index.ts')

/**
 *
 * @returns {HastTransformer} - Unified Transformer
 */
function rehypePreData() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre') return

      const [codeEl] = node.children

      if (codeEl?.type !== 'element') return

      if (codeEl.tagName !== 'code') return

      const meta = {
        __src__: node.properties?.['__src__'],
        __style__: node.properties?.['__style__'],
        twoslash: true,
      }

      const metastring = Object.entries(meta)
        .filter((entry) => entry[1] != null)
        .map((entry) => (entry[1] === true ? entry[0] : `${entry[0]}=${entry[1]}`))
        .join(' ')

      /**
       * @see https://github.com/shikijs/shiki/blob/c028cd35cf2644a17e950a913188f5122f2baf89/packages/rehype/src/handlers.ts#L59
       */
      codeEl.properties['metastring'] = metastring

      if (!codeEl.data) return

      if (!('meta' in codeEl.data)) return

      if (!codeEl.data.meta) return

      if (typeof codeEl.data.meta !== 'string') return

      // Extract event from meta and pass it down the tree.
      const regex = /event="([^"]*)"/

      const match = codeEl.data?.meta.match(regex)

      if (match) {
        codeEl.data.meta = codeEl.data.meta.replace(regex, '')
      }
    })
  }
}

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
  preprocess: [
    mdsxPreprocess({
      blueprints: {
        default: {
          path: path.resolve(__dirname, relativeBlueprintPath),
        },
      },
      unified: (processor) => {
        return (
          processor
            // .use(rehypeComponentExample)
            .use(rehypePreData)
            .use(rehypeSlug)
            .use(rehypeAutolinkHeadings, { properties: { class: 'header-anchor' } })
            .use(shikiRehype, {
              addLanguageClass: true,
              themes: {
                light: 'github-light',
                dark: 'github-dark-high-contrast',
              },
              defaultColor: false,
              parseMetaString,
              transformers: [
                transformerNotationDiff(),
                transformerNotationHighlight(),
                transformerNotationWordHighlight(),
                transformerNotationFocus(),
                transformerNotationErrorLevel(),
                transformerRenderWhitespace(),
                transformerMetaHighlight(),
                // transformerMetaWordHighlight(),
                {
                  name: 'vitepress:add-class',
                  pre(hast) {
                    hast.properties['lang'] = this.options.lang
                    hast.properties['meta'] = this.options.meta?.__raw

                    const title = this.options.meta?.['title'] || this.options.lang

                    // The value to be visible on the rendered markdown somewhere so it loads the icon.
                    hast.properties['vitepress-plugin-group-icons'] = `data-title="${title}"`

                    if (this.options.meta?.['__src__']) {
                      hast.properties['data-src'] = this.options.meta?.['__src__']
                    }

                    if (this.options.meta?.['__style__']) {
                      hast.properties['data-style'] = this.options.meta?.['__style__']
                    }

                    this.addClassToHast(hast, 'vp-code')

                    if (this.options.lang) {
                      this.addClassToHast(hast, `language-${this.options.lang}`)
                    }
                  },
                  code(hast) {
                    hast.properties['lang'] = this.options.lang
                    hast.properties['meta'] = this.options.meta?.__raw

                    if (this.options.meta?.['showLineNumbers']) {
                      hast.properties['data-line-numbers'] = ''
                      const lines = hast.children.filter((child) => child.type === 'element')
                      const maxDigits = Math.floor(Math.log10(Math.abs(lines.length))) + 1
                      hast.properties['data-line-numbers-max-digits'] = Math.min(maxDigits, 1)
                      hast.properties['style'] ||= ''
                      hast.properties['style'] =
                        `${hast.properties['style']} --line-numbers-max-digits: ${maxDigits};`.trim()
                    }
                  },
                  span(_hast, _line, _col, lineElement) {
                    if (this.options.meta?.['showLineNumbers']) {
                      lineElement.properties['data-line'] = ''
                    }
                  },
                },
                transformerTwoslash({
                  langs: ['ts', 'tsx', 'svelte'],
                  twoslasher: createTwoslasher({
                    nodeModules: rootNodeModules,
                  }),
                  twoslashOptions: {
                    compilerOptions: {
                      jsx: ts.JsxEmit.Preserve,
                      paths: {
                        $lib: ['./src/lib'],
                        '$lib/*': ['./src/lib/*'],
                      },
                      moduleResolution: ts.ModuleResolutionKind.Bundler,
                      module: ts.ModuleKind.ESNext,
                      target: ts.ScriptTarget.ESNext,
                    },
                  },
                  explicitTrigger: true,
                  renderer: rendererFloatingSvelte(),
                }),
              ],
            })
        )
      },
    }),
  ],
}

export default config
