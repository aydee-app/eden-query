<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  import { aponia, eden } from '$lib/eden'

  const hello = createQuery(eden.api.index.get.queryOptions())

  const bye = aponia.api.bye.get.createQuery()
</script>

<main>
  <h1>Batch</h1>

  <p>
    Because two queries are launched concurrently, the request is actually made to a /batch
    endpoint.
  </p>

  <div>
    {#if $hello.isLoading}
      <p>Hello loading...</p>
    {:else if $hello.isError}
      <p>
        <b>Hello Error: </b>
        <span>{$hello.error.message}</span>
      </p>
    {:else}
      <p>
        <b>Hello Query: </b>
        <span>{$hello.data}</span>
      </p>
    {/if}
  </div>

  <hr />

  <div>
    {#if $bye.isLoading}
      <p>Bye loading...</p>
    {:else if $bye.isError}
      <p>
        <b>Bye Error: </b>
        <span>{$bye.error.message}</span>
      </p>
    {:else}
      <p>
        <b>Bye Query: </b>
        <span>{$bye.data}</span>
      </p>
    {/if}
  </div>
</main>
