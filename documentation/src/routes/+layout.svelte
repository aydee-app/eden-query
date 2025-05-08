<script lang="ts">
  import '../app.css'

  import ThemeModeWatcher from '$lib/components/theme-mode-watcher.svelte'

  let { children } = $props()
</script>

<ThemeModeWatcher />

<div class="flex min-h-dvh flex-col">
  <div class="contents">
    {@render children()}
  </div>
</div>
