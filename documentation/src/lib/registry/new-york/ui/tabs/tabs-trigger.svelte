<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    value,
    ...restProps
  }: TabsPrimitive.TriggerProps = $props()
</script>

<TabsPrimitive.Trigger
  bind:ref
  class={cn(
    'tab gap-2',
    // 'btn btn-sm no-animation',
    // 'ring-offset-base-100 h-full min-h-0 rounded-sm shadow-none',
    // 'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',

    'focus-visible:outline-none',
    'disabled:tab-disabled',
    'data-[state=active]:tab-active',
    className,
  )}
  {value}
  {...restProps}
/>
