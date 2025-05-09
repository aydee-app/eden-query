<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    children,
    heading,
    ...restProps
  }: CommandPrimitive.GroupProps & {
    heading?: string
  } = $props()
</script>

<CommandPrimitive.Group
  class={cn(
    'text-base-content overflow-hidden p-1',
    '[&_[data-cmdk-group-heading]]:text-base-content/70',
    '[&_[data-cmdk-group-heading]]:px-2',
    '[&_[data-cmdk-group-heading]]:py-1.5',
    '[&_[data-cmdk-group-heading]]:text-xs',
    '[&_[data-cmdk-group-heading]]:font-medium',
    className,
  )}
  bind:ref
  {...restProps}
>
  {#if heading}
    <CommandPrimitive.GroupHeading class="text-muted-foreground px-2 py-1.5 text-xs font-medium">
      {heading}
    </CommandPrimitive.GroupHeading>
  {/if}
  <CommandPrimitive.GroupItems {children} />
</CommandPrimitive.Group>
