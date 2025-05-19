<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = 'default',
    ...restProps
  }: DropdownMenuPrimitive.ItemProps & {
    inset?: boolean
    variant?: 'default' | 'destructive'
  } = $props()
</script>

<DropdownMenuPrimitive.Item
  bind:ref
  data-slot="dropdown-menu-item"
  data-inset={inset}
  data-variant={variant}
  class={cn(
    'btn btn-ghost btn-sm no-animation',
    'flex cursor-default justify-start border-none text-sm font-normal outline-hidden select-none',
    'data-highlighted:btn-active',
    'data-[variant=destructive]:btn-error',
    'data-[disabled]:pointer-events-none',
    'data-[disabled]:opacity-50',
    'data-[inset]:pl-8',
    "[&_svg:not([class*='text-'])]:text-base-content/70",
    '[&_svg]:pointer-events-none',
    '[&_svg]:shrink-0',
    "[&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...restProps}
/>
