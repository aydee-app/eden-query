<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.DescriptionProps = $props()
</script>

<DialogPrimitive.Description
  bind:ref
  class={cn('text-base-content/70 text-sm', className)}
  {...restProps}
/>
