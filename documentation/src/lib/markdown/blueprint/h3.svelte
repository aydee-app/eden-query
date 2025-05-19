<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils/cn'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLHeadingElement> = $props()
</script>

<h3
  class={cn(
    'font-heading scroll-m-20 text-lg font-semibold tracking-tight [&:not(:first-child)]:mt-8',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</h3>
