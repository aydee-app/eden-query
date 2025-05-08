<script lang="ts">
  import { Collapsible, type CollapsibleTriggerProps } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let { class: className, children, ...restProps }: CollapsibleTriggerProps = $props()
</script>

<Collapsible.Trigger {...restProps} class={cn('collapse-title rounded-box', className)}>
  {@render children?.()}
</Collapsible.Trigger>
