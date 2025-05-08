<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: AvatarPrimitive.FallbackProps = $props()
</script>

<AvatarPrimitive.Fallback
  bind:ref
  class={cn('bg-base-100 flex size-full items-center justify-center', className)}
  {...restProps}
/>
