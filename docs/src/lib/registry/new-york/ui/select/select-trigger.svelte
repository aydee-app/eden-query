<script lang="ts">
  import { Select as SelectPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> = $props()
</script>

<SelectPrimitive.Trigger
  bind:ref
  class={cn(
    'btn btn-sm no-animation flex-nowrap truncate',
    'flex items-center',
    'ring-base-content ring-1 focus:ring focus:ring-offset-2',

    'data-[disabled]:btn-disabled data-[highlighted]:btn-active data-[state=open]:btn-active',

    // 'border-input ring-offset-background',
    // 'data-[placeholder]:text-muted-foreground',
    // 'flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm',
    // 'focus:ring-ring focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <span class="grow"></span>
  <span class="icon-[mdi--chevron-down] size-4 opacity-50"></span>
</SelectPrimitive.Trigger>
