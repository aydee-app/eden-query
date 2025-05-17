import { createHash as createHashFunc } from 'node:crypto'
import path from 'node:path'
import process from 'node:process'

import { type Header, type PageIndexInfo, SEARCH_INDEX_NAME } from '@rspress/core'
import { compile } from '@rspress/mdx-rs'
import { json } from '@sveltejs/kit'
import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import { htmlToText } from 'html-to-text'
import { groupBy } from 'lodash-es'
import { toMarkdown } from 'mdast-util-to-markdown'
import { parse, preprocess } from 'svelte/compiler'
import { render } from 'svelte/server'
import { walk } from 'zimmerframe'

import config from '../../../../svelte.config'
import type { EntryGenerator, RequestHandler } from './$types'

/**
 * @example
 * search_index.7411fbd6.json
 */
const searchIndices: Record<string, PageIndexInfo[]> = {}

const __dirname = process.cwd()

/**
 * Glob import route source code.
 */
const pageSources = import.meta.glob('/src/routes/**/+page.*', {
  query: '?raw',
  import: 'default',
})

/**
 * Glob import route components.
 */
const pageComponents = import.meta.glob('/src/routes/**/+page.*', {
  import: 'default',
})

const pages = await Promise.all(
  Object.entries(pageComponents).map(async ([key, value], index) => {
    const absolutePath = path.join(__dirname, key)

    const relativePath = path.relative('/src/routes', key)

    const frontmatter: Record<string, any> = {}

    let routePath = relativePath
      .split('/')
      .filter((segment) => !segment.match(/^\(.+\)$/))
      .slice(0, -1)
      .join('/')

    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath
    }

    const component: any = await value()

    const output = render(component)

    const sourceImport = pageSources[key]

    if (sourceImport) {
      const source: any = await sourceImport()

      const filename = key

      const { code } = await preprocess(source, config.preprocess, { filename })

      const ast = parse(code, { filename })

      const moduleState = {
        exports: {} as Record<string, any>,
      }

      if (ast['module']?.['content']) {
        walk(ast['module']?.['content'], moduleState, {
          VariableDeclarator(node, { state, visit }) {
            const value = visit(node.init, state)
            return { [node.id.name]: value }
          },
          ObjectExpression(node, { visit }) {
            const object: any = {}

            for (const property of node.properties) {
              const result = visit(property)
              Object.assign(object, result)
            }

            return object
          },
          Property(node, { visit }) {
            const key = visit(node.key)
            const value = visit(node.value)
            return { [key]: value }
          },
          Literal(node) {
            return node.value
          },
          ArrowFunctionExpression() {
            return true
          },
          Identifier(node) {
            return node.name
          },
          ExportNamedDeclaration(node, { state, visit }) {
            if (node.declaration?.declarations) {
              for (const declaration of node.declaration.declarations) {
                const result = visit(declaration, state)
                Object.assign(state.exports, result)
              }

              return
            }

            // if (node.specifiers?.length > 0) {
            //   for (const specifier of node.specifiers) {
            //     state.exports.push(specifier.exported.name)
            //   }

            //   return
            // }

            // if (node.declaration?.type === 'FunctionDeclaration') {
            //   state.exports.push(node.declaration.id.name)

            //   return
            // }
          },
        })

        const metadata = moduleState.exports['metadata'] || {}

        Object.assign(frontmatter, metadata)
      }
    }

    const defaultIndexInfo: PageIndexInfo = {
      id: index,
      title: '',
      content: '',
      // _flattenContent: '',
      _html: '',
      routePath,
      lang: '', // route.lang,
      toc: [],
      domain: '',
      frontmatter,
      version: '', // route.version,
      _filepath: absolutePath,
      _relativePath: key,
    }

    const hast = fromHtml(output.body)

    const mdast = toMdast(hast)

    const markdown = toMarkdown(mdast)

    const {
      // html: rawHtml,
      title,
      toc: rawToc,
      // languages,
    } = await compile({
      value: markdown,
      filepath: '', // route.absolutePath,
      development: process.env['NODE_ENV'] !== 'production',
      root: '',
    })

    // const html = encodeHtml(String(rawHtml))

    const content = htmlToText(output.body, {
      // default value of decodeEntities is `true`, so that htmlToText can decode &lt; &gt;
      // decodeEntities: true,
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

    const page: PageIndexInfo = {
      ...defaultIndexInfo,
      title: frontmatter['title'] || title,
      toc,
      // for search index
      content,
      // _flattenContent: flattenContent,
      _html: output.body,
      frontmatter: {
        ...frontmatter,
        __content: undefined,
      },
    }

    return page
  }),
)

// modify page index by plugins
// await pluginDriver.modifySearchIndexData(pages)

const versioned = false

const groupedPages = groupBy(pages, (page) => {
  if (page.frontmatter?.pageType === 'home') {
    return 'noindex'
  }

  const version = versioned ? page.version : ''
  const lang = page.lang || ''

  return `${version}###${lang}`
})

// remove the pages marked as noindex
delete groupedPages['noindex']

const indexHashByGroup = {} as Record<string, string>

await Promise.all(
  Object.keys(groupedPages).map(async (group) => {
    const data = groupedPages[group]?.map(deletePrivateField) || []

    // Avoid writing filepath in compile-time
    const stringifiedIndex = JSON.stringify(data)
    const indexHash = createHash(stringifiedIndex)
    indexHashByGroup[group] = indexHash

    const [version, lang] = group.split('###')
    const indexVersion = version ? `.${version.replace('.', '_')}` : ''
    const indexLang = lang ? `.${lang}` : ''

    searchIndices[`${SEARCH_INDEX_NAME}${indexVersion}${indexLang}.${indexHash}.json`] = data

    // await fs.mkdir(TEMP_DIR, { recursive: true })
    // await fs.writeFile(
    //   path.join(TEMP_DIR, `${SEARCH_INDEX_NAME}${indexVersion}${indexLang}.${indexHash}.json`),
    //   stringifiedIndex,
    // )
  }),
)

// Default value.
searchIndices[`${SEARCH_INDEX_NAME}.json`] = Object.values(groupedPages)[0] || []

export const entries: EntryGenerator = async () => {
  return Object.entries(searchIndices).map(([key, _value]) => {
    return {
      slug: key,
    }
  })
}

export const GET: RequestHandler = async (event) => {
  const key = event.params.slug
  return json(searchIndices[key])
}

function deletePrivateField<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  const newObj: T = { ...obj }
  for (const key in newObj) {
    if (key.startsWith('_')) {
      delete newObj[key]
    }
  }
  return newObj
}

function createHash(str: string) {
  return createHashFunc('sha256').update(str).digest('hex').slice(0, 8)
}
