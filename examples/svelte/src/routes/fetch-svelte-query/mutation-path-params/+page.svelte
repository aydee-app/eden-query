<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'

  import { hua, mobius } from '$lib/eden'

  const id = '2'

  const queryClient = useQueryClient()

  const queryOptions = mobius.queryOptions('/api/posts/:id', { params: { id } })

  const query = hua.createQuery('/api/posts/:id', { params: { id } })

  const mutation = hua.createMutation('/api/posts/:id', { method: 'PATCH', params: { id } })

  let value = $state('')

  async function handleSubmit() {
    await $mutation.mutateAsync(value)
    await queryClient.invalidateQueries(queryOptions)
  }
</script>

<p>{$query.data?.id}</p>
<p>{$query.data?.message}</p>

<input type="text" bind:value />
<button onclick={handleSubmit}>Submit</button>
