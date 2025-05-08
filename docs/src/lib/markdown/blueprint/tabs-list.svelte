<script lang="ts">
  import * as Tabs from '$lib/registry/new-york/ui/tabs'

  let props = $props()
</script>

<Tabs.List {...props} class="tabs-box vp-code-group">
  {@render props.children?.()}
</Tabs.List>
