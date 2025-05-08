<script lang="ts">
  import { Collapsible, type CollapsibleRootProps } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let { class: className, children, ...restProps }: CollapsibleRootProps = $props()
</script>

<Collapsible.Root
  {...restProps}
  class={cn(
    'collapse',
    'group',
    'data-[state=open]:collapse-open',
    'data-[state=closed]:collapse-close',
    className,
  )}
>
  {@render children?.()}
</Collapsible.Root>
