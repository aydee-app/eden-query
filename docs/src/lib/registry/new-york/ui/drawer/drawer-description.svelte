<script lang="ts">
  import { Drawer as DrawerPrimitive } from 'vaul-svelte'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DrawerPrimitive.DescriptionProps = $props()
</script>

<DrawerPrimitive.Description
  bind:ref
  class={cn('text-base-content/70 text-sm', className)}
  {...restProps}
/>
