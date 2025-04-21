<script lang="ts">
  import { hua } from '$lib/eden'

  const query = hua.createQuery('/api/posts/:id', { params: { id: '2' } })
</script>

{$query.data?.id}
{$query.data?.message}
