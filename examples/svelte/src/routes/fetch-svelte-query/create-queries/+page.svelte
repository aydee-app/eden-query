<script lang="ts">
  import { hua } from '$lib/eden'

  const queries = hua.createQueries((a) => {
    return [
      a.queryOptions('/api/posts/:id', { params: { id: '0' } }),
      a.queryOptions('/api/posts/:id', { params: { id: '1' } }),
      a.queryOptions('/api/posts/:id', { params: { id: '2' } }),
    ]
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
