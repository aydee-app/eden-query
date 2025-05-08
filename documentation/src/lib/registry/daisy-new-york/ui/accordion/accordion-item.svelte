<script lang="ts">
  import { Accordion as AccordionPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AccordionPrimitive.ItemProps = $props()
</script>

<AccordionPrimitive.Item
  bind:ref
  class={cn('collapse', 'data-[state=open]:collapse-open', 'rounded-none border-b', className)}
  {...restProps}
/>
