<script lang="ts">
  import type { WithElementRef } from 'bits-ui'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props()
</script>

<span
  class={cn('text-base-content/70 ml-auto text-xs tracking-widest', className)}
  {...restProps}
  bind:this={ref}
>
  {@render children?.()}
</span>
