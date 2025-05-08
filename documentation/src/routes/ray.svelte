<script lang="ts">
  import { cn } from '$lib/utils/cn'

  interface $$Props {
    isSafari?: boolean
    animated?: boolean
    isStatic?: boolean
    class?: string
  }

  const { isStatic, isSafari, animated, class: className }: $$Props = $props()

  const shouldAnimate =
    animated || (typeof navigator !== 'undefined' && navigator?.hardwareConcurrency > 4)
</script>

<div
  class={cn(
    'absolute left-0 top-0 z-[40]',
    'h-[220px] w-full !max-w-full',
    'flex flex-col items-center justify-center',
    'transition-bg pointer-events-none overflow-hidden bg-transparent opacity-25 dark:opacity-[.55]',
    className,
  )}
>
  <div
    class={cn(
      'jumbo static absolute opacity-60',
      isSafari && '-safari',
      isStatic && '-static',
      shouldAnimate && '-animate',
    )}
  ></div>
</div>
