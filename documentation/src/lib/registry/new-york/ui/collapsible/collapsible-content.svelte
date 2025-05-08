<script lang="ts">
  import { Collapsible, type CollapsibleContentProps } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let { class: className, children, ...restProps }: CollapsibleContentProps = $props()
</script>

<Collapsible.Content forceMount {...restProps} class={cn('collapse-content', className)}>
  {@render children?.()}
</Collapsible.Content>
