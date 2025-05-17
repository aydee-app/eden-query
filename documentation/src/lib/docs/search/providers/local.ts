/**
 * The local search provider.
 * Powered by FlexSearch. https://github.com/nextapps-de/flexsearch
 *
 * @see https://github.com/nextapps-de/flexsearch/issues/438
 */

import { type PageIndexInfo, removeTrailingSlash, SEARCH_INDEX_NAME } from '@rspress/shared'
import Index, { type IndexOptionsForDocumentSearch } from 'flexsearch'

import type { SearchOptions } from '../types'
import { normalizeTextCase } from '../utils'
import { LOCAL_INDEX, type Provider, type SearchQuery } from '.'

type FlexSearchDocumentWithType = Index.Document<PageIndexInfo, true>

interface PageIndexForFlexSearch extends PageIndexInfo {
  normalizedContent: string
  headers: string
  normalizedTitle: string
}

const cjkRegex =
  /[\u3131-\u314e|\u314f-\u3163|\uac00-\ud7a3]|[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]|[\u3041-\u3096]|[\u30A1-\u30FA]/giu

const cyrillicRegex = /[\u0400-\u04FF]/g

function tokenize(value: string, regex: RegExp) {
  const words: string[] = []

  let match: RegExpExecArray | null = null

  do {
    match = regex.exec(value)

    if (match) {
      words.push(match[0])
    }
  } while (match)

  return words
}

export class LocalProvider implements Provider {
  /**
   * English Index
   */
  #index?: FlexSearchDocumentWithType

  /**
   * CJK: Chinese, Japanese, Korean
   */
  #cjkIndex?: FlexSearchDocumentWithType

  /**
   * Cyrillic Index
   */
  #cyrillicIndex?: FlexSearchDocumentWithType

  #fetchPromise?: Promise<PageIndexInfo[]>

  async #getPages(lang: string, version: string): Promise<PageIndexInfo[]> {
    /**
     * @todo
     */
    const __WEBPACK_PUBLIC_PATH__ = ''

    /**
     * @todo
     */
    // const searchIndexHash: any = {}

    // const searchIndexGroupID = `${version ?? ''}###${lang ?? ''}`

    // const hash = searchIndexHash[searchIndexGroupID]

    // For example, in page-type-home fixture, there is only home index.md, so no search index is generated.
    // if (!hash) return []

    const searchIndexVersion = version ? version.replace('.', '_') : ''
    // const json = `${SEARCH_INDEX_NAME}${searchIndexVersion ? '.' : ''}${searchIndexVersion}${lang ? '.' : ''}${lang}.${hash}.json`
    const json = `${SEARCH_INDEX_NAME}${searchIndexVersion ? '.' : ''}${searchIndexVersion}${lang ? '.' : ''}${lang}.json`
    const searchIndexURL = `${removeTrailingSlash(__WEBPACK_PUBLIC_PATH__)}/static/${json}`

    try {
      const result = await fetch(searchIndexURL)

      if (result.ok) {
        return result.json()
      }

      throw result
    } catch (error) {
      console.error('Failed to fetch search index, please reload the page and try again.')
      console.error(error)
    }

    return []
  }

  async fetchSearchIndex(options: SearchOptions) {
    if (this.#fetchPromise) return this.#fetchPromise

    const { currentLang, currentVersion } = options

    const versioned = options.mode !== 'remote' && options.versioned

    this.#fetchPromise = this.#getPages(currentLang, versioned ? currentVersion : '')

    return this.#fetchPromise
  }

  async init(options: SearchOptions, initialSearchIndex?: PageIndexInfo[]) {
    const searchIndex = initialSearchIndex ?? (await this.fetchSearchIndex(options))

    const pagesForSearch: PageIndexForFlexSearch[] = searchIndex.map((page) => {
      return {
        ...page,
        normalizedContent: normalizeTextCase(page.content),
        headers: page.toc.map((header) => normalizeTextCase(header.text)).join(' '),
        normalizedTitle: normalizeTextCase(page.title),
      }
    })

    const createOptions: IndexOptionsForDocumentSearch<PageIndexInfo, true> = {
      tokenize: 'full',
      document: {
        id: 'id',
        store: true,
        index: ['normalizedTitle', 'headers', 'normalizedContent'],
      },
      cache: 100,
      // charset: {
      //   split: /\W+/,
      // },
    }

    // Initialize search indices.

    this.#index = new Index.Document(createOptions)

    this.#cjkIndex = new Index.Document({
      ...createOptions,
      tokenize: (str: string) => tokenize(str, cjkRegex),
    })

    this.#cyrillicIndex = new Index.Document({
      ...createOptions,
      tokenize: (str: string) => tokenize(str, cyrillicRegex),
    })

    for (const item of pagesForSearch) {
      // Add search index async to avoid blocking the main thread
      this.#index.addAsync(item.id, item)
      this.#cjkIndex.addAsync(item.id, item)
      this.#cyrillicIndex.addAsync(item.id, item)
    }
  }

  async search(query: SearchQuery) {
    const { keyword, limit } = query

    const options = {
      enrich: true as const,
      limit,
      index: ['normalizedTitle', 'headers', 'normalizedContent'],
    }

    const searchResult = await Promise.all([
      this.#index?.searchAsync<true>(keyword, options),
      this.#cjkIndex?.searchAsync<true>(keyword, options),
      this.#cyrillicIndex?.searchAsync<true>(keyword, options),
    ])

    const hits: PageIndexInfo[] = []

    const hitIds = new Set()

    searchResult.forEach((searchResultItem) => {
      if (!searchResultItem) return

      searchResultItem.forEach((item) => {
        item.result.forEach((resultItem) => {
          const id = resultItem.id

          if (!hitIds.has(id)) {
            hitIds.add(id)
            hits.push(resultItem.doc)
          }
        })
      })
    })

    return [
      {
        index: LOCAL_INDEX,
        hits: hits,
      },
    ]
  }
}
