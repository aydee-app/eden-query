<script lang="ts">
  import themeOrder from 'daisyui/functions/themeOrder'
  import globalThemes from 'daisyui/theme/object'
  import { mode as globalMode, setMode, setTheme, theme as globalTheme } from 'mode-watcher'

  import { getMessages } from '$lib/i18n'
  import { ScrollArea } from '$lib/registry/new-york/ui/scroll-area'
  import * as Select from '$lib/registry/new-york/ui/select'
  import { cn } from '$lib/utils/cn'

  type Props = {
    class?: string
    theme?: string | null
    themes?: Record<string, string>
    mode?: typeof globalMode.current | null
    local?: boolean
  }

  let {
    theme = $bindable(globalTheme.current),
    mode = $bindable(globalMode.current),
    themes = $bindable({}),
    local = false,
    ...props
  }: Props = $props()

  const messages = getMessages()

  function handleSelectedChange(newTheme: string) {
    const newMode = globalThemes[newTheme]?.['color-scheme']

    /**
     * e.g. If the current mode is "light" and the theme is "cupcake", set light=cupcake.
     *
     * When toggling between dark/light mode, switch to cupcake instead of the
     * default light theme for light mode.
     */
    if (newMode) {
      if (local) {
        themes[newMode] = newTheme
      } else {
        localStorage.setItem(newMode, newTheme)
      }
    }

    if (local) {
      theme = newTheme
      mode = newMode as any
    } else {
      setTheme(newTheme)
      setMode(newMode as any)
    }
  }

  $effect(() => {
    if (local) {
      theme ||= globalTheme.current || null
      mode ||= globalMode.current || null
      return
    }

    theme = globalTheme.current || null
    mode = globalMode.current || null
  })
</script>

<!--
@component

Select input that can choose a specific theme.
Selecting a specific theme will persist it to localstorage under the "light" or "dark" key.
-->

<Select.Root type="single" onValueChange={handleSelectedChange} value={theme || undefined}>
  <div data-tip={$messages.selectTheme()} class={cn('tooltip tooltip-bottom', props.class)}>
    <Select.Trigger class="w-28">
      <span class="theme-select-label" data-placeholder={$messages.selectTheme()}>
        {theme}
      </span>
    </Select.Trigger>
  </div>

  <Select.Content>
    <ScrollArea class="h-64 pr-3">
      <Select.Group class="w-full">
        {#each themeOrder as theme}
          {@const themeDetails = globalThemes[theme]}

          <Select.Item value={theme} label={theme}>
            <div
              data-theme={theme}
              class="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-md p-1 shadow-sm"
            >
              <div class="bg-base-content size-1 rounded-full"></div>
              <div class="bg-primary size-1 rounded-full"></div>
              <div class="bg-secondary size-1 rounded-full"></div>
              <div class="bg-accent size-1 rounded-full"></div>
            </div>

            <span class="grow">
              {theme}
            </span>

            <span
              class={cn(
                themeDetails?.['color-scheme'] === 'dark'
                  ? 'icon-[mdi--moon-waxing-crescent]'
                  : 'icon-[mdi--weather-sunny]',
              )}
            ></span>
          </Select.Item>
        {/each}
      </Select.Group>
    </ScrollArea>
  </Select.Content>
</Select.Root>

<style>
  /** If label is empty, use the data-theme variable on the HTML tag as the content. */
  .theme-select-label:empty::before {
    content: var(--data-theme, attr(data-placeholder));
  }
</style>
