<script lang="ts">
  import type { Separator as SeparatorPrimitive } from 'bits-ui'

  import { Separator } from '$lib/registry/new-york/ui/separator'
  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SeparatorPrimitive.RootProps = $props()
</script>

<Separator bind:ref class={cn('bg-base-200 -mx-1 my-1 h-px', className)} {...restProps} />
