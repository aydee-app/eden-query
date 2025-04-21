<script lang="ts">
  import { hydrate, QueryClientProvider } from '@tanstack/svelte-query'

  import { aponia, eden, hua,mobius } from '$lib/eden'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  hydrate(data.queryClient, data.dehydrated)

  eden.treaty.client = data.client
  aponia.treaty.client = data.client
  mobius.client = data.client
  hua.client = data.client
</script>

<QueryClientProvider client={data.queryClient}>
  <header>
    <a href="/">Home</a>

    <div>
      <p>Eden-Treaty + Tanstack-Query</p>

      <nav>
        <ul>
          <li>
            <a href="/query-path-params">Query Path Params</a>
          </li>
          <li>
            <a href="/mutation-path-params">Mutation Path Params</a>
          </li>
          <li>
            <a href="/create-queries">Create Queries</a>
          </li>
          <li>
            <a href="/ssr">SSR</a>
          </li>
        </ul>
      </nav>
    </div>

    <div>
      <p>Eden-Fetch + Svelte-Query</p>

      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/fetch-svelte-query/query-path-params">Query Path Params</a>
          </li>
          <li>
            <a href="/fetch-svelte-query/mutation-path-params">Mutation Path Params</a>
          </li>
          <li>
            <a href="/fetch-svelte-query/create-queries">Create Queries</a>
          </li>
          <li>
            <a href="/fetch-svelte-query/ssr">SSR</a>
          </li>
        </ul>
      </nav>
    </div>
  </header>

  <div style="border-bottom: 1px solid black"></div>

  {@render children()}
</QueryClientProvider>
