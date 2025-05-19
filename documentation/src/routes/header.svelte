<script lang="ts">
  import type {
    DefaultMatchResult,
    DefaultMatchResultItem,
    HighlightInfo,
  } from '@rspress/theme-default'
  import { mode, resetMode, setMode, setTheme, type SystemModeValue } from 'mode-watcher'

  import ThemeSelect from '$lib/components/theme-select.svelte'
  // import LanguageSelect from '$lib/components/language-select.svelte'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { PageSearcher } from '$lib/docs/search/page-searcher'
  import type { MatchResult } from '$lib/docs/search/types'
  import { getSlicedStrByByteLength } from '$lib/docs/search/utils'
  import * as Command from '$lib/registry/daisy-new-york/ui/command'
  import { cn } from '$lib/utils/cn'

  let open = $state(false)

  let value = $state('')

  let tabIndex = $state(0)

  let matched: MatchResult = $state([])

  const suggestions = $derived(matched[tabIndex]?.result || []) as DefaultMatchResult['result']

  const normalizedSuggestions = $derived(normalizeSuggestions(suggestions))

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      open = true
    }
  }

  function normalizeSuggestions(
    suggestions: DefaultMatchResult['result'],
  ): Record<string, DefaultMatchResultItem[]> {
    return suggestions.reduce(
      (groups, item) => {
        const group = item.title
        if (!groups[group]) {
          groups[group] = []
        }
        groups[group].push(item)
        return groups
      },
      {} as Record<string, DefaultMatchResult['result']>,
    )
  }

  const searcher = new PageSearcher({ currentLang: '', currentVersion: '' })

  searcher.init()

  function createDebounced<T extends any[]>(fn: (...args: T) => unknown, duration = 250) {
    let timeout: ReturnType<typeof setTimeout>

    return (...args: T) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), duration)
    }
  }

  async function handleSearch(value: string) {
    const result = await searcher.match(value)
    matched = result
  }

  const debouncedSearch = createDebounced(handleSearch)

  function setThemeMode(newMode: NonNullable<SystemModeValue>) {
    /**
     * See if a more specific theme can be found by using the current mode.
     */
    const newTheme = localStorage.getItem(newMode) || newMode

    setMode(newMode)
    setTheme(newTheme)
  }

  function resetThemeMode() {
    resetMode()

    if (mode.current) {
      setThemeMode(mode.current)
    }
  }

  $effect(() => {
    debouncedSearch(value)
  })

  interface HighlightedFragment {
    type?: 'highlighted' | 'raw'
    value: string
  }

  const getHighlightedFragments = (rawText: string, highlights: HighlightInfo[]) => {
    // Split raw text into several parts, and add styles.mark className to the parts that need to be highlighted.
    // highlightInfoList is an array of objects, each object contains the start index and the length of the part that needs to be highlighted.
    // For example, if the statement is "This is a statement", and the query is "is", then highlightInfoList is [{start: 2, length: 2}, {start: 5, length: 2}].
    const fragmentList: HighlightedFragment[] = []

    let lastIndex = 0

    for (const highlightInfo of highlights) {
      const { start, length } = highlightInfo
      const prefix = rawText.slice(lastIndex, start)
      const queryStr = getSlicedStrByByteLength(rawText, start, length)

      fragmentList.push({ value: prefix })
      fragmentList.push({ type: 'highlighted', value: queryStr })

      lastIndex = start + queryStr.length
    }

    if (lastIndex < rawText.length) {
      fragmentList.push({ value: rawText.slice(lastIndex) })
    }

    return fragmentList
  }
</script>

<svelte:document onkeydown={handleKeydown} />

{#snippet commandListOptions()}
  <Command.Empty>No results found.</Command.Empty>

  {#each Object.entries(normalizedSuggestions) as [group, suggestions], index (group)}
    {#if index > 0}
      <Command.Separator />
    {/if}

    <Command.Group heading={group}>
      {#each suggestions as suggestion, suggestionIndex (suggestionIndex)}
        <!-- {@const accummulatedIndex = index + suggestionIndex} -->

        <Command.LinkItem
          href={suggestion.link}
          class="group h-16 h-auto gap-2 text-left"
          value={`${index},${suggestionIndex}`}
        >
          <div class="flex items-center">
            <span
              class={cn(
                'size-6',
                suggestion.type === 'title' && 'icon-[mdi--hashtag]',
                suggestion.type === 'header' && 'icon-[mdi--file]',
                suggestion.type === 'content' && 'icon-[mdi--file-eye]',
              )}
            >
            </span>
          </div>

          <div class="grow">
            {#if suggestion.type === 'header'}
              {@const fragments = getHighlightedFragments(
                suggestion.header,
                suggestion.highlightInfoList,
              )}

              {#each fragments as fragment, index (index)}
                {#if fragment.type === 'highlighted'}
                  <span class="text-primary group-hover:underline">{fragment.value}</span>
                {:else}
                  <span>{fragment.value}</span>
                {/if}
              {/each}
            {:else if suggestion.type === 'title'}
              {@const fragments = getHighlightedFragments(
                suggestion.title,
                suggestion.highlightInfoList,
              )}

              {#each fragments as fragment, index (index)}
                {#if fragment.type === 'highlighted'}
                  <span class="text-primary group-hover:underline">{fragment.value}</span>
                {:else}
                  <span>{fragment.value}</span>
                {/if}
              {/each}
            {:else if suggestion.type === 'content'}
              {@const fragments = getHighlightedFragments(
                suggestion.statement,
                suggestion.highlightInfoList,
              )}

              {#each fragments as fragment, index (index)}
                {#if fragment.type === 'highlighted'}
                  <span class="text-primary group-hover:underline">{fragment.value}</span>
                {:else}
                  <span>{fragment.value}</span>
                {/if}
              {/each}
              <p class="text-xs">{suggestion.title}</p>
            {/if}
          </div>

          <div class="opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100">
            <span class="icon-[mdi--arrow-left-bottom] size-6"></span>
          </div>
        </Command.LinkItem>
      {/each}
    </Command.Group>
  {/each}

  <Command.Separator />

  <Command.Group heading="Theme">
    <Command.Item value="light" onSelect={setThemeMode.bind(null, 'light')}>
      <span class="icon-[mdi--weather-sunny] mr-2 size-4"></span>
      <span>Light</span>
    </Command.Item>

    <Command.Item value="dark" onSelect={setThemeMode.bind(null, 'dark')}>
      <span class="icon-[mdi--moon-waning-crescent] mr-2 size-4"></span>
      <span>Dark</span>
    </Command.Item>

    <Command.Item value="system" onSelect={resetThemeMode}>
      <span class="icon-[mdi--laptop] mr-2 size-4"></span>
      <span>System</span>
    </Command.Item>
  </Command.Group>
{/snippet}

<Command.Dialog bind:open shouldFilter={false}>
  <Command.Input placeholder="Type a command or search" bind:value />
  <Command.List>
    {@render commandListOptions()}
  </Command.List>
</Command.Dialog>

<header>
  <div class="navbar bg-base-100 shadow-sm">
    <div class="navbar-start grow">
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </div>
      </div>

      <a href="/" class="btn btn-ghost text-xl">
        <img src="/assets/elysia.svg" alt="Elysia.js logo" height="32" width="32" />
        <span> Elysia.js</span>
      </a>

      <Command.Root class="group relative w-fit overflow-visible" shouldFilter={false}>
        <label class="input pl-0">
          <div class="w-full grow">
            <Command.Input type="search" placeholder="Search" bind:value />
          </div>

          <kbd class="kbd kbd-sm">⌘</kbd>
          <kbd class="kbd kbd-sm">K</kbd>
        </label>

        <Command.List
          class="bg-base-100 absolute top-11/10 left-0 h-fit w-max max-w-sm min-w-full rounded border opacity-0 group-has-[input:focus]:opacity-100"
        >
          {@render commandListOptions()}
        </Command.List>
      </Command.Root>
    </div>

    <div class="navbar-center hidden grow justify-end lg:flex">
      <ul class="menu">
        <li>
          <a href="/guide/eden-query">Eden Query</a>
        </li>
      </ul>
    </div>

    <div class="navbar-end w-auto gap-4">
      <div class="flex shrink-0 gap-2">
        <ThemeToggle />
        <ThemeSelect />
        <!-- <LanguageSelect /> -->
      </div>

      <div class="shrink-0 space-x-1">
        <a
          href="https://github.com/ap0nia/eden-query"
          target="_blank"
          class="btn btn-sm btn-circle btn-ghost"
          aria-label="X/Twitter link"
        >
          <span class="icon-[lineicons--github] size-6"></span>
        </a>

        <a
          href="https://twitter.com/elysiajs"
          target="_blank"
          class="btn btn-sm btn-circle btn-ghost"
          aria-label="X/Twitter link"
        >
          <span class="icon-[line-md--twitter-x] size-6"></span>
        </a>

        <a
          href="https://discord.gg/eaFJ2KDJck"
          target="_blank"
          class="btn btn-sm btn-circle btn-ghost"
          aria-label="X/Twitter link"
        >
          <span class="icon-[lineicons--discord] size-6"></span>
        </a>
      </div>
    </div>
  </div>
</header>
