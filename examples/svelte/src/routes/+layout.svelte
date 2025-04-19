<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query'

  import { aponia, eden } from '$lib/eden'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  eden.treaty.client = data.client
  aponia.treaty.client = data.client
</script>

<QueryClientProvider client={data.queryClient}>
  <header>
    <nav>
      <ul>
        <li>
          <a href="/">home</a>
        </li>
        <li>
          <a href="/hello-preload">hello with preloading</a>
        </li>
        <li>
          <a href="/hello-ssr">hello with ssr</a>
        </li>
        <li>
          <a href="/batch">batch</a>
        </li>
        <li>
          <a href="/mutation">mutation example with todos</a>
        </li>
        <li>
          <a href="/reactive-input">reactive input box</a>
        </li>
        <li>
          <a href="/abort">abort</a>
        </li>
      </ul>
    </nav>
  </header>

  {@render children()}
</QueryClientProvider>
