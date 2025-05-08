<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props()
</script>

<TabsPrimitive.List
  bind:ref
  class={cn(
    'tabs',
    // 'bg-base-200 text-base-content/90',
    // 'inline-flex h-9 items-center justify-center gap-0.5 rounded-md p-1',
    className,
  )}
  {...restProps}
/>
