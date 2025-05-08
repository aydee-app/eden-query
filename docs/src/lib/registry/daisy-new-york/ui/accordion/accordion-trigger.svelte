<script lang="ts">
  import { Accordion as AccordionPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    level = 3,
    children,
    ...restProps
  }: WithoutChild<AccordionPrimitive.TriggerProps> & {
    level?: AccordionPrimitive.HeaderProps['level']
  } = $props()
</script>

<AccordionPrimitive.Header {level} class="flex">
  <AccordionPrimitive.Trigger
    bind:ref
    class={cn(
      'flex min-h-0 items-center justify-between px-0 py-4 text-sm font-medium transition-all hover:underline',
      'collapse-title',
      '[&[data-state=open]>span[class*=icon]]:rotate-180',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
    <span
      class="icon-[lucide--chevron-down] text-base-content/60 size-4 shrink-0 transition-transform duration-200"
    ></span>
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
