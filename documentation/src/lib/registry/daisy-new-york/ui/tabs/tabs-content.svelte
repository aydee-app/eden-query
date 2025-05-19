<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    value,
    ...restProps
  }: TabsPrimitive.ContentProps = $props()
</script>

<TabsPrimitive.Content
  bind:ref
  class={cn(
    // 'mt-2 ring-offset-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'relative',
    'ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    className,
  )}
  {value}
  {...restProps}
/>
