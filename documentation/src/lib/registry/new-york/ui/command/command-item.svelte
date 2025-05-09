<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CommandPrimitive.ItemProps = $props()
</script>

<CommandPrimitive.Item
  class={cn(
    'btn btn-ghost btn-sm no-animation',
    'relative flex items-center justify-start px-2 py-1.5',
    'rounded-sm text-sm font-normal normal-case outline-none',
    'cursor-default select-none',
    'aria-selected:btn-active',
    'data-[disabled]:btn-disabled',
    className,
  )}
  bind:ref
  {...restProps}
/>
