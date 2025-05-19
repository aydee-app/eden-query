<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: CommandPrimitive.SeparatorProps = $props()
</script>

<CommandPrimitive.Separator
  bind:ref
  class={cn('divider', '-mx-1 my-0 h-px', className)}
  {...restProps}
/>
