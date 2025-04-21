<script lang="ts">
  import { createQueries } from '@tanstack/svelte-query'

  import { eden } from '$lib/eden'

  const queries = createQueries({
    queries: [
      eden.api.posts({ id: '0' }).get.queryOptions(),
      eden.api.posts({ id: '1' }).get.queryOptions(),
      eden.api.posts({ id: '2' }).get.queryOptions(),
    ],
  })
</script>

<ul>
  {#each $queries as query, index}
    <li style="border: 1px solid pink; border-radius: 8px; padding: 4px;">
      <p>{index}</p>
      <p>{query.data?.id}</p>
      <p>{query.data?.message}</p>
    </li>
  {/each}
</ul>
