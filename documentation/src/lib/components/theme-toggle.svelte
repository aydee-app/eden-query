<script lang="ts">
  import { mode as globalMode, setMode, setTheme, theme as globalTheme } from 'mode-watcher'

  import { getMessages } from '$lib/i18n'
  import { cn } from '$lib/utils/cn'

  type Props = {
    class?: string
    mode?: typeof globalMode.current | null
    local?: boolean
    theme?: string | null
    themes?: Record<string, string>
  }

  let {
    mode = $bindable(globalMode.current || null),
    theme = $bindable(globalTheme.current || null),
    themes,
    local = false,
    ...props
  }: Props = $props()

  const messages = getMessages()

  async function toggleTheme() {
    const newMode = mode === 'dark' ? 'light' : 'dark'

    /**
     * See if a more specific theme can be found by using the current mode.
     */
    const newTheme = themes?.[newMode] || localStorage.getItem(newMode) || newMode

    if (local) {
      mode = newMode
      theme = newTheme
    } else {
      setMode(newMode)
      setTheme(newTheme)
    }
  }

  $effect(() => {
    if (local) {
      theme ||= globalTheme.current || null
      mode ||= globalMode.current || null
    } else {
      theme = globalTheme.current || null
      mode = globalMode.current || null
    }
  })
</script>

<!--
@component

Button that toggles between light and dark mode.
It can also use specific themes specified by the 'light' and 'dark' keys from localstorage.
-->

<div data-tip={$messages.toggleTheme()} class={cn('tooltip tooltip-bottom', props.class)}>
  <button
    onclick={toggleTheme}
    class="btn btn-sm btn-square btn-outline"
    aria-label="Color scheme toggle"
  >
    <span class="swap swap-rotate" class:swap-active={mode === 'dark'}>
      <span
        class={cn(
          'icon-[mdi--moon-waxing-crescent] swap-on size-4',

          // $mode is undefined on the server and thus on mount.
          // Before it's mounted for the first time, force the dark icon to be static.
          !globalMode.current && 'dark:!rotate-0 dark:!opacity-100',
        )}
      ></span>
      <span
        class={cn(
          !globalMode.current && 'dark:opacity-0',
          'icon-[mdi--weather-sunny] swap-off size-4',
        )}
      ></span>
    </span>
  </button>
</div>
