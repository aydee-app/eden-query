<script lang="ts">
  import { NavigationMenu as NavigationMenuPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<NavigationMenuPrimitive.LinkProps> = $props()
</script>

<NavigationMenuPrimitive.Link
  class={cn('focus:menu-focus', 'focus-visible:menu-focus', className)}
  {...restProps}
>
  {@render children?.()}
</NavigationMenuPrimitive.Link>
