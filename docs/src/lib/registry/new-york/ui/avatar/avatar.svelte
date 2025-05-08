<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    class: className,
    ref = $bindable(null),
    loadingStatus = $bindable('loading'),
    ...restProps
  }: AvatarPrimitive.RootProps = $props()
</script>

<AvatarPrimitive.Root
  bind:loadingStatus
  bind:ref
  class={cn('avatar rounded', className)}
  {...restProps}
/>
