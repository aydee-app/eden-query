<script lang="ts">
  import { writable } from 'svelte/store'

  import { intersectingOnce } from '$lib/actions/intersecting'
  import { cn } from '$lib/utils/cn'

  const intersecting = writable(false)
</script>

<div use:intersectingOnce={intersecting} class="mx-auto flex w-full max-w-xl flex-col gap-6">
  <div
    class={cn(
      $intersecting ? 'animate-in' : 'animate-out',
      'fade-out zoom-out zoom-in fade-in fill-mode-both duration-1000 ease-in-out',
      'flex items-center gap-2 text-gray-300 dark:text-gray-500',
    )}
  >
    <div class="flex h-[1px] w-full grow bg-gray-300 dark:bg-gray-500"></div>
    <span class="icon-[mdi--heart-outline] h-8 w-8 shrink-0"></span>
    <div class="flex h-[1px] w-full grow bg-gray-300 dark:bg-gray-500"></div>
  </div>

  <h2
    class={cn(
      $intersecting ? 'animate-in opacity-80' : 'opacity-0',
      'fade-in slide-in-from-top-4 delay-300 duration-1000',
      'text-center leading-normal',
    )}
  >
    <span>The first production ready,</span>
    <br class="sm:none block" />
    <span>and most loved Bun framework</span>
  </h2>
</div>
