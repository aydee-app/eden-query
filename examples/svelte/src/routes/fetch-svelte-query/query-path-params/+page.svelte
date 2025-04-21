<script lang="ts">
  import { hua } from '$lib/eden'

  const query = hua.createQuery('/api/posts/:id', { params: { id: '1' } })
</script>

<p>{$query.data?.id}</p>
<p>{$query.data?.message}</p>
