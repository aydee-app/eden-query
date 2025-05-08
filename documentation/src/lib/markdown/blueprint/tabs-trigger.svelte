<script lang="ts">
  import * as Tabs from '$lib/registry/new-york/ui/tabs'

  let props = $props()
</script>

<Tabs.Trigger {...props}>
  {@render props.children?.()}
</Tabs.Trigger>
