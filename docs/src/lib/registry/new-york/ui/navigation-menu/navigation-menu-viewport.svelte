<script lang="ts">
  import { NavigationMenu as NavigationMenuPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<NavigationMenuPrimitive.ViewportProps> = $props()
</script>

<NavigationMenuPrimitive.Viewport
  class={cn(
    'text-base-content bg-base-100',

    'relative mt-2.5 overflow-hidden rounded-md border shadow-lg transition-[width,_height] duration-200',

    'h-[var(--bits-navigation-menu-viewport-height)] w-full sm:w-[var(--bits-navigation-menu-viewport-width)]',

    'data-[state=closed]:animate-scale-out',
    'data-[state=open]:animate-scale-in',

    'origin-[top_center]',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</NavigationMenuPrimitive.Viewport>
