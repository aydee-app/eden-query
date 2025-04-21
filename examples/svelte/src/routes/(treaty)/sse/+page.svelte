<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  import { eden } from '$lib/eden'

  const query = createQuery(eden.api.numbers.get.queryOptions())

  async function runGenerator<T>(generator: AsyncGenerator<T>, callback: (data: T) => any) {
    for await (const data of generator) {
      callback(data)
    }
  }

  $effect(() => {
    if (!$query.data) return

    runGenerator($query.data, (data) => {
      console.log('generated', { data })
    })
  })
</script>
