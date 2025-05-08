<script lang="ts">
  import type { Snippet } from 'svelte'

  import * as Tabs from '$lib/registry/new-york/ui/tabs'

  type Props = {
    value: string
    children?: Snippet
  }

  let props: Props = $props()
</script>

<Tabs.Content value={props.value} class="border-t [&>div[class*=language]]:my-0">
  {@render props.children?.()}
</Tabs.Content>
