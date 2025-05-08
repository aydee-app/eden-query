<script lang="ts">
  import { Dialog as SheetPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils/cn'

  import { sheetVariants, type Side } from '.'
  import SheetOverlay from './sheet-overlay.svelte'

  let {
    ref = $bindable(null),
    class: className,
    side = 'right',
    portalProps,
    children,
    ...restProps
  }: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
    portalProps?: SheetPrimitive.PortalProps
    side?: Side
    children: Snippet
  } = $props()
</script>

<SheetPrimitive.Portal {...portalProps}>
  <SheetOverlay />

  <SheetPrimitive.Content bind:ref class={cn(sheetVariants({ side }), className)} {...restProps}>
    {@render children?.()}

    <SheetPrimitive.Close class={cn('absolute right-4 top-4', 'btn btn-xs')}>
      <span class="icon-[mdi--close] size-4"></span>
      <span class="sr-only">Close</span>
    </SheetPrimitive.Close>
  </SheetPrimitive.Content>
</SheetPrimitive.Portal>
