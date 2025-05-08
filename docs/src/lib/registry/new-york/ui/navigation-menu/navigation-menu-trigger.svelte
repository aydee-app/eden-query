<script lang="ts">
  import { NavigationMenu as NavigationMenuPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<NavigationMenuPrimitive.TriggerProps> = $props()
</script>

<NavigationMenuPrimitive.Trigger
  class={cn(
    'focus-visible:menu-focus data-[highlighted]:menu-focus',
    'data-[state=open]:menu-focus',

    className,
  )}
  {...restProps}
>
  {@render children?.()}

  <span
    class={cn(
      'icon-[mdi--caret-down]',
      'relative top-px ml-1 size-3',
      'transition-transform duration-200',
      'group-data-[state=open]:-rotate-180',
    )}
    aria-hidden="true"
  ></span>
</NavigationMenuPrimitive.Trigger>
