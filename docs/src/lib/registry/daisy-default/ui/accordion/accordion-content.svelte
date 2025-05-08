<script lang="ts">
  import { Accordion as AccordionPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithoutChild<AccordionPrimitive.ContentProps> = $props()
</script>

<AccordionPrimitive.Content
  bind:ref
  forceMount
  class={cn('p-0 text-sm', 'collapse-content', className)}
  {...restProps}
>
  <div class="pb-4 pt-0">
    {@render children?.()}
  </div>
</AccordionPrimitive.Content>
