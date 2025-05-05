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

<h1>createQueries</h1>

<p>Endpoint: /api/posts</p>

<p>IDs: ['0', '1', '2']</p>

<ul>
  {#each $queries as query, index (index)}
    <li style="border: 1px solid pink; border-radius: 8px; padding: 4px;">
      <p>{index}</p>
      <p>{query.data?.id}</p>
      <p>{query.data?.message}</p>
    </li>
  {/each}
</ul>
