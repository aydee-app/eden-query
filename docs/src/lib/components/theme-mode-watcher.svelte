<script lang="ts">
  import { mode, ModeWatcher, setTheme, theme } from 'mode-watcher'
  import type { ComponentProps } from 'svelte'

  type ModeWatcherProps = ComponentProps<typeof ModeWatcher>

  type Mode = NonNullable<ModeWatcherProps['defaultMode']>

  interface ThemeModeWatcherProps extends Omit<ModeWatcherProps, 'defaultTheme'> {
    defaultTheme?: string | Partial<Record<Mode, string> & Record<string, string>>
  }

  let props: ThemeModeWatcherProps = $props()

  const defaultTheme = $derived(
    typeof props.defaultTheme === 'string' ? props.defaultTheme : undefined,
  )

  const nonceProp = $derived(typeof window === 'undefined' ? ` nonce=${props.nonce}` : '')

  /**
   * Set the initial theme to "lght" or "dark".
   * https://github.com/svecosystem/mode-watcher/blob/68b144e9bfacdca2418e93a4bd86a893f42df8e5/packages/mode-watcher/src/lib/mode.ts
   */
  function setInitialTheme({
    defaultMode = 'system',
    // themeColors,
    // darkClassNames = ['dark'],
    // lightClassNames = [],
    defaultTheme = '',
    modeStorageKey = 'mode-watcher-mode',
    themeStorageKey = 'mode-watcher-theme',
  }: ThemeModeWatcherProps) {
    let mode = localStorage.getItem(modeStorageKey) || defaultMode

    const light =
      mode === 'light' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)

    mode = light ? 'light' : 'dark'

    const theme =
      localStorage.getItem(themeStorageKey) ||
      (typeof defaultTheme === 'object' ? defaultTheme[mode] : defaultTheme)

    const rootElement = document.documentElement

    if (theme) {
      rootElement.setAttribute('data-theme', theme)
      localStorage.setItem(themeStorageKey, theme)
    }
  }

  const setInitialThemeDeclaration = setInitialTheme.toString()

  const setInitialThemeArgs = $derived(JSON.stringify({ ...props, defaultTheme }))

  /**
   * @example "(function setInitialTheme(args) { ... }) (args)"
   */
  const setInitialThemeInvocation = $derived(
    `(${setInitialThemeDeclaration})(${setInitialThemeArgs})`,
  )

  $effect(() => {
    if (!theme.current && mode.current) {
      setTheme(mode.current)
    }
  })

  const openingScriptTag = $derived(`<script ${nonceProp}>`)
</script>

<!-- 
  @component
  Enhanced implementation of the default {@link ModeWatcher} component that also sets the initial
  theme and keeps it defined as long as {@link mode} is defined.
-->

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags, prefer-template -->
  {@html `${openingScriptTag}${setInitialThemeInvocation}</script>`}
</svelte:head>

<ModeWatcher {...props} {defaultTheme} />
