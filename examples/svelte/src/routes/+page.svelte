<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  import { eden } from '$lib/eden'

  const hello = createQuery(eden.api.index.get.queryOptions())
</script>

<main>
  <h1>Home</h1>

  <div>
    {#if $hello.isLoading}
      <p>loading...</p>
    {:else if $hello.isError}
      <p>Error: {$hello.error.message}</p>
    {:else}
      <p>
        <b>Data: </b>
        <span>{$hello.data}</span>
      </p>
    {/if}
  </div>
</main>
