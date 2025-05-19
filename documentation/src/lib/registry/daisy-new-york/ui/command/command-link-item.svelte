<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CommandPrimitive.LinkItemProps = $props()
</script>

<CommandPrimitive.LinkItem
  class={cn(
    'btn btn-ghost btn-sm no-animation',
    'aria-selected:btn-active',
    // 'aria-selected:bg-accent',
    // 'aria-selected:text-accent-foreground',
    'flex h-auto cursor-default justify-start border-none px-2 py-1.5 text-sm font-normal outline-hidden select-none',
    // 'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
    'data-[disabled]:btn-disabled',
    // 'data-[disabled]:pointer-events-none',
    // 'data-[disabled]:opacity-50',
    '[&_svg]:pointer-events-none',
    '[&_svg]:size-4',
    '[&_svg]:shrink-0',
    className,
  )}
  bind:ref
  {...restProps}
/>
