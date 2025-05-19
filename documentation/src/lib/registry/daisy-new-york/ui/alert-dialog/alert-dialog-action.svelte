<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: AlertDialogPrimitive.ActionProps = $props()
</script>

<AlertDialogPrimitive.Action bind:ref class={cn('btn', className)} {...restProps} />
