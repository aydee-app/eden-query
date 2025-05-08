<script lang="ts">
  import type { WithChildren } from 'bits-ui'
  import type { Details } from 'mdast'

  import * as Collapsible from '$lib/registry/new-york/ui/collapsible'

  let props: WithChildren<Details> = $props()

  let { title = 'Details', open, children } = props
</script>

<Collapsible.Root open={Boolean(open)} class="bg-base-300 group">
  <Collapsible.Trigger class="flex items-center gap-2">
    <span class="icon-[mdi--chevron-right] transition-transform group-data-[state=open]:rotate-90"
    ></span>
    <span>{title}</span>
  </Collapsible.Trigger>

  <Collapsible.Content class="overflow-auto">{@render children?.()}</Collapsible.Content>
</Collapsible.Root>
