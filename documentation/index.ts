import fs from 'node:fs/promises'
import path from 'node:path'

import type { Header, PageIndexInfo } from '@rspress/shared'
import { DEFAULT_PAGE_EXTENSIONS } from '@rspress/shared/constants'
import { htmlToText } from 'html-to-text'
import { parse, preprocess } from 'svelte/compiler'
import { walk } from 'zimmerframe'

import { PluginDriver } from './src/lib/rspress/plugin-driver'
import { RouteService } from './src/lib/rspress/route/route-service'
import config from './svelte.config'

const domain = ''

const root = './src/routes'

const headings = Array.from({ length: 6 }, (_, i) => `h${i + 1}`)

const routeService = new RouteService(
  root,
  {
    route: {
      extensions: [...DEFAULT_PAGE_EXTENSIONS, '.svelte'],
    },
  },
  '',
  new PluginDriver({}, false),
)

await routeService.init()

const routeMeta = routeService.getRoutes()

const svelteRouteMeta = await Promise.all(
  routeMeta
    .filter((meta) => {
      return meta.pageName.endsWith('+page')
    })
    .map((meta) => {
      const segments = meta.routePath
        .split('/')
        .filter((segment) => !segment.match(/^\(.+\)$/))
        .slice(0, -1)

      const routePath = segments.join('/') || '/'

      return { ...meta, routePath }
    })
    .map(async (route, index): Promise<PageIndexInfo | null> => {
      const defaultIndexInfo: PageIndexInfo = {
        id: index,
        title: '',
        content: '',
        // _flattenContent: '',
        _html: '',
        routePath: route.routePath,
        lang: route.lang,
        toc: [],
        domain,
        frontmatter: {},
        version: route.version,
        _filepath: route.absolutePath,
        _relativePath: path.relative(root, route.absolutePath).split(path.sep).join('/'),
      }

      const content = await fs.readFile(route.absolutePath, 'utf8')

      const filename = route.absolutePath

      const { code } = await preprocess(content, config.preprocess, { filename })

      const ast = parse(code, { filename })

      // const htmlState = {
      //   toc: [] as Header[],
      // }

      const moduleState = {
        exports: {},
      } as {
        exports: any
      }

      // if (ast['html']) {
      //   walk(ast['html'], htmlState, {
      //     InlineComponent(node, { state }) {
      //       const name: string = node.name
      //       const tag = name.split('.').at(-1)

      //       if (!tag) return

      //       const depth = parseInt(tag.at(-1) || '')

      //       if (headings.includes(tag)) {
      //         const id = node.attributes[0]?.value[0]?.data
      //         const text = node.attributes[0]?.value[0]?.raw

      //         const header: Header = {
      //           id,
      //           text,
      //           depth,
      //           charIndex: 0,
      //         }

      //         state.toc.push(header)
      //       }
      //     },
      //   })
      // }

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
            // if (node.specifiers?.length > 0) {
            //   for (const specifier of node.specifiers) {
            //     state.exports.push(specifier.exported.name)
            //   }

            //   return
            // }

            if (node.declaration?.declarations) {
              for (const declaration of node.declaration.declarations) {
                const result = visit(declaration, state)
                Object.assign(state.exports, result)
                // state.exports.push(specifier.exported.name)
              }

              // node.declaration.declarations.forEach((declaration) => {
              //   exports.push(declaration.id.name)
              // })

              return
            }

            if (node.declaration?.type === 'FunctionDeclaration') {
              state.exports.push(node.declaration.id.name)

              return
            }
          },
        })
      }

      const text = htmlToText(code)

      console.log({ text, moduleState })
      // console.log({ text, htmlState, moduleState })

      return defaultIndexInfo
    }),
)

// console.log(svelteRouteMeta)
