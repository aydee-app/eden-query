import type { Header, PageIndexInfo } from '@rspress/core'
import { compile } from '@rspress/mdx-rs'
import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import { htmlToText } from 'html-to-text'
import { toMarkdown } from 'mdast-util-to-markdown'
import { render } from 'svelte/server'

import type { LayoutServerLoad } from './$types'

// const rawPages = import.meta.glob('/src/routes/**/+page.svelte', {
//   query: '?raw',
//   import: 'default',
// })

const pages = import.meta.glob('/src/routes/**/+page.svelte', {
  import: 'default',
})

const imports = Object.entries(pages).map(([key, value]) => {
  return { path: key, mod: value }
})

const imported = await Promise.all(
  imports.map(async (information) => {
    const component: any = await information.mod()
    // const content: any = await rawPages[information.path]?.() || ''

    return { ...information, component /*, content */ }
  }),
)

const outputs = imported.map((component) => {
  return render(component.component)
})

/**
 * Escape JSX elements in code block to allow them to be searched
 * @link https://github.com/sindresorhus/escape-goat/blob/eab4a382fcf5c977f7195e20d92ab1b25e6040a7/index.js#L3
 */
function encodeHtml(html: string): string {
  return html.replace(
    /<code>([\s\S]*?)<\/\s?code>/gm,
    function (_match: string, innerContent: string) {
      return `<code>${innerContent
        .replace(/&/g, '&amp;') // Must happen first or else it will escape other just-escaped characters.
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</code>`
    },
  )
}

export const load: LayoutServerLoad = async () => {
  const texts = await Promise.all(
    outputs.map(async (rendered, index) => {
      const defaultIndexInfo: PageIndexInfo = {
        id: index,
        title: '',
        content: '',
        // _flattenContent: '',
        _html: '',
        routePath: '', // route.routePath,
        lang: '', // route.lang,
        toc: [],
        domain: '',
        frontmatter: {},
        version: '', // route.version,
        _filepath: '', // route.absolutePath,
        _relativePath: '', // path.relative(root, route.absolutePath).split(path.sep).join('/'),
      }

      const hast = fromHtml(rendered.body)

      const mdast = toMdast(hast)

      const markdown = toMarkdown(mdast)

      const {
        html: rawHtml,
        title,
        toc: rawToc,
        // languages,
      } = await compile({
        value: markdown,
        filepath: '', // route.absolutePath,
        development: false, // process.env.NODE_ENV !== 'production',
        root: '',
      })

      const html = encodeHtml(String(rawHtml))

      const content = htmlToText(html, {
        // decodeEntities: true, // default value of decodeEntities is `true`, so that htmlToText can decode &lt; &gt;
        wordwrap: 80,
        selectors: [
          {
            selector: 'a',
            options: {
              ignoreHref: true,
            },
          },
          {
            selector: 'img',
            format: 'skip',
          },
          {
            // Skip code blocks
            selector: 'pre > code',
            format: 'block',
            // format: searchCodeBlocks ? 'block' : 'skip',
          },
          ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => ({
            selector: tag,
            options: {
              uppercase: false,
            },
          })),
        ],
        tables: true,
        longWordSplit: {
          forceWrapOnLimit: true,
        },
      })

      // rawToc comes from mdx compile and it uses `-number` to unique toc of same id
      // We need to find the character index position of each toc in the content thus benefiting for search engines
      const toc: Header[] = rawToc.map((item) => {
        const match = item.id.match(/-(\d+)$/)
        let position = -1
        if (match) {
          for (let i = 0; i < Number(match[1]); i++) {
            // When text is repeated, the position needs to be determined based on -number
            position = content.indexOf(`\n${item.text}#\n\n`, position + 1)

            // If the positions don't match, it means the text itself may exist -number
            if (position === -1) {
              break
            }
          }
        }
        return {
          ...item,
          charIndex: content.indexOf(`\n${item.text}#\n\n`, position + 1),
        }
      })

      return {
        ...defaultIndexInfo,
        title: title, // frontmatter.title || title,
        toc,
        // for search index
        content,
        // _flattenContent: flattenContent,
        _html: rendered.body,
        frontmatter: {
          // ...frontmatter,
          __content: undefined,
        },
      } satisfies PageIndexInfo
    }),
  )

  console.log(texts)
}
