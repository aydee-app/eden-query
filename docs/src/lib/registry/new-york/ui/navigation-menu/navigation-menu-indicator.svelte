<script lang="ts">
  import { NavigationMenu as NavigationMenuPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<NavigationMenuPrimitive.IndicatorProps> = $props()
</script>

<NavigationMenuPrimitive.Indicator
  class={cn(
    'top-full z-10 flex h-2.5 items-end justify-center overflow-hidden opacity-100 duration-200',
    'data-[state=hidden]:animate-fade-out',
    'data-[state=visible]:animate-fade-in',
    'transition-[all,transform_250ms_ease]',
    'data-[state=hidden]:opacity-0',
    className,
  )}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <div class="bg-base-content rounded-tl-xs relative top-3/4 size-2.5 rotate-45"></div>
  {/if}
</NavigationMenuPrimitive.Indicator>
