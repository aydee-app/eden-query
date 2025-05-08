<script lang="ts">
  import { NavigationMenu as NavigationMenuPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<NavigationMenuPrimitive.ItemProps> = $props()
</script>

<NavigationMenuPrimitive.Item
  class={cn('[position:unset]', 'has-data-[disabled]:menu-disabled', className)}
  {...restProps}
>
  {@render children?.()}
</NavigationMenuPrimitive.Item>
