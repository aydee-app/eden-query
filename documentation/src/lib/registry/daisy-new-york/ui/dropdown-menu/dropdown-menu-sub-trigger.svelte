<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    children,
    ...restProps
  }: DropdownMenuPrimitive.SubTriggerProps & {
    inset?: boolean
  } = $props()
</script>

<DropdownMenuPrimitive.SubTrigger
  bind:ref
  data-slot="dropdown-menu-sub-trigger"
  class={cn(
    'btn btn-ghost btn-sm no-animation',
    'flex cursor-default justify-start border-none text-sm font-normal outline-hidden select-none',
    'data-[state=open]:btn-active',
    'flex cursor-default justify-start border-none text-sm font-normal outline-hidden select-none',
    inset && 'pl-8',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronRightIcon class="ml-auto size-4" />
</DropdownMenuPrimitive.SubTrigger>
