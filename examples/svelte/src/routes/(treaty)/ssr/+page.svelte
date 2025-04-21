<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  import { eden } from '$lib/eden'

  const query = createQuery(eden.api.posts({ id: '1' }).get.queryOptions())
</script>

{$query.data?.id}
{$query.data?.message}
