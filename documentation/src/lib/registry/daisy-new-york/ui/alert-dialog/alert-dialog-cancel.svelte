<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: AlertDialogPrimitive.CancelProps = $props()
</script>

<AlertDialogPrimitive.Cancel
  bind:ref
  class={cn('btn btn-outline', 'mt-2 sm:mt-0', className)}
  {...restProps}
/>
