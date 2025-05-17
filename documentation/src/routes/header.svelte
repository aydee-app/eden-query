<script lang="ts">
  import Laptop from '@lucide/svelte/icons/laptop'
  import Moon from '@lucide/svelte/icons/moon'
  import Sun from '@lucide/svelte/icons/sun'
  import type {
    DefaultMatchResult,
    DefaultMatchResultItem,
    HighlightInfo,
  } from '@rspress/theme-default'
  import { resetMode, setMode } from 'mode-watcher'

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { PageSearcher } from '$lib/docs/search/page-searcher'
  import type { MatchResult } from '$lib/docs/search/types'
  import { getSlicedStrByByteLength } from '$lib/docs/search/utils'
  import * as Command from '$lib/registry/new-york/ui/command'
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

  function runCommand(cmd: () => void) {
    open = false
    cmd()
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

<Command.Dialog bind:open shouldFilter={false}>
  <Command.Input placeholder="Type a command or search" bind:value />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>

    <!--
    <Command.Group heading="Links">
      {#each mainNav as navItem (navItem.title)}
        <Command.LinkItem value={navItem.title} href={navItem.href} onSelect={() => (open = false)}>
          <File class="mr-2 size-4" />
          {navItem.title}
        </Command.LinkItem>
      {/each}
    </Command.Group>
    -->

    <!--
    {#each sidebarNav as group (group.title)}
      <Command.Group heading={group.title}>
        {#each group.items as navItem (navItem.title)}
          <Command.LinkItem
            value={navItem.title}
            href={navItem.href}
            onSelect={() => (open = false)}
          >
            <div class="mr-2 flex size-4 items-center justify-center">
              <Circle class="size-3" />
            </div>
            {navItem.title}
          </Command.LinkItem>
        {/each}
      </Command.Group>
    {/each}
    -->
    {#each Object.entries(normalizedSuggestions) as [group, suggestions], index (group)}
      {#if index > 0}
        <Command.Separator />
      {/if}

      <Command.Group>
        {#each suggestions as suggestion, suggestionIndex (suggestionIndex)}
          <!-- {@const accummulatedIndex = index + suggestionIndex} -->

          <Command.LinkItem
            href={suggestion.link}
            class="h-auto text-left"
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

            {#if suggestion.type === 'header'}
              {@const fragments = getHighlightedFragments(
                suggestion.header,
                suggestion.highlightInfoList,
              )}

              <div>
                {#each fragments as fragment, index (index)}
                  {#if fragment.type === 'highlighted'}
                    <span class="text-primary">{fragment.value}</span>
                  {:else}
                    <span>{fragment.value}</span>
                  {/if}
                {/each}
              </div>
            {:else if suggestion.type === 'title'}
              {@const fragments = getHighlightedFragments(
                suggestion.title,
                suggestion.highlightInfoList,
              )}

              <div>
                {#each fragments as fragment, index (index)}
                  {#if fragment.type === 'highlighted'}
                    <span class="text-primary">{fragment.value}</span>
                  {:else}
                    <span>{fragment.value}</span>
                  {/if}
                {/each}
              </div>
            {:else if suggestion.type === 'content'}
              {@const fragments = getHighlightedFragments(
                suggestion.statement,
                suggestion.highlightInfoList,
              )}

              <div>
                {#each fragments as fragment, index (index)}
                  {#if fragment.type === 'highlighted'}
                    <span class="text-primary">{fragment.value}</span>
                  {:else}
                    <span>{fragment.value}</span>
                  {/if}
                {/each}
                <p class="text-xs">{suggestion.title}</p>
              </div>
            {/if}
          </Command.LinkItem>
        {/each}
      </Command.Group>
    {/each}

    <Command.Separator />

    <Command.Group heading="Theme">
      <Command.Item value="light" onSelect={() => runCommand(() => setMode('light'))}>
        <Sun class="mr-2 size-4" />
        Light
      </Command.Item>

      <Command.Item value="dark" onSelect={() => runCommand(() => setMode('dark'))}>
        <Moon class="mr-2 size-4" />
        Dark
      </Command.Item>

      <Command.Item value="system" onSelect={() => runCommand(() => resetMode())}>
        <Laptop class="mr-2 size-4" />
        System
      </Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>

<header>
  <div class="navbar bg-base-100 shadow-sm">
    <div class="navbar-start">
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

      <label class="input">
        <span class="icon-[mdi--search] size-8"></span>
        <input type="search" class="grow" placeholder="Search" />
        <kbd class="kbd kbd-sm">⌘</kbd>
        <kbd class="kbd kbd-sm">K</kbd>
      </label>
    </div>

    <div class="navbar-center hidden lg:flex"></div>

    <div class="navbar-end gap-4">
      <ul class="menu menu-sm">
        <li>
          <a href="/guide/eden-query">Eden Query</a>
        </li>
      </ul>

      <div class="flex items-center gap-4">
        <ThemeToggle />

        <div class="space-x-1">
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
  </div>
</header>
