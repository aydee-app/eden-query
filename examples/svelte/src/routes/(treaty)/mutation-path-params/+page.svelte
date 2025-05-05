<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'

  import { eden } from '$lib/eden'

  const id = '2'

  const queryClient = useQueryClient()

  const queryOptions = eden.api.posts({ id }).get.queryOptions()

  const query = createQuery(queryOptions)

  const mutation = createMutation(eden.api.posts({ id }).patch.mutationOptions())

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
