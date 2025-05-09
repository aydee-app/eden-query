<script lang="ts">
  import '../app.css'

  import ThemeModeWatcher from '$lib/components/theme-mode-watcher.svelte'
  import { createObservableLocale, setLocale, setMessages } from '$lib/i18n'
  import { Toaster } from '$lib/registry/new-york/ui/sonner'

  let { children } = $props()

  const locale = createObservableLocale()

  setLocale(locale)

  const messages = setMessages(locale)
</script>

<ThemeModeWatcher />
<Toaster dir={$messages.__direction() as any} />

<div class="flex min-h-dvh flex-col">
  <div class="contents">
    {@render children()}
  </div>
</div>
