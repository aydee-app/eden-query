<script lang="ts">
  import { createQuery, keepPreviousData } from '@tanstack/svelte-query'
  import { derived, writable } from 'svelte/store'

  import { eden } from '$lib/eden'

  const search = writable('')

  const queryOptions = derived(search, (search) => {
    const current = eden.api.names.get.queryOptions({ query: { search } })
    return { ...current, placeholderData: keepPreviousData }
  })

  const names = createQuery(queryOptions)
</script>

<main>
  <h1>Reactive Input</h1>

  <p>Matching Names</p>

  <p>The developer can optimize this reactive input by using debounce...</p>

  <ul>
    {#each $names.data ?? [] as name}
      <li>{name}</li>
    {/each}
  </ul>

  <label>
    <p>Search for a name by typing into the box</p>
    <input type="text" bind:value={$search} placeholder="Enter name here..." />
  </label>
</main>
