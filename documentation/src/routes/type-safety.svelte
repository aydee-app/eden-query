<script lang="ts">
  import { IsInViewport } from 'runed'
  import { fly, slide } from 'svelte/transition'

  import * as Tabs from '$lib/registry/daisy-new-york/ui/tabs'
  import Input from '$lib/snippets/type-safety/input.md'
  import Macros from '$lib/snippets/type-safety/macros.md'
  import Output from '$lib/snippets/type-safety/output.md'
  import { cn } from '$lib/utils/cn'

  let targetNode = $state<HTMLElement>()!

  let contentNode = $state<HTMLElement>()!

  const inView = new IsInViewport(() => targetNode)

  const contentInView = new IsInViewport(() => contentNode)

  const tabs = [
    { id: 'input', label: 'Input', content: Input },
    { id: 'output', label: 'Output', content: Output },
    { id: 'macros', label: 'Macros', content: Macros },
  ]

  let value = $state(tabs[0]?.id)

  const tab = $derived(tabs.find((tab) => tab.id === value))
</script>

<article class="mx-auto w-full max-w-5xl space-y-4 p-4">
  <h1
    class="flex flex-col justify-center text-2xl font-medium text-gray-500 md:flex-row md:items-center md:gap-4 dark:text-gray-400"
  >
    <p
      class={cn(
        inView.current ? 'animate-in' : 'animate-out',
        'fade-out fade-in slide-in-from-top-4 fill-mode-both duration-1000 ease-in-out',
        'bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-7xl leading-[6rem] font-semibold text-transparent',
      )}
    >
      Type Safety
    </p>
  </h1>

  <Tabs.Root bind:value class="relative">
    <div bind:this={targetNode}>
      <section
        class="flex h-[38rem] items-center justify-center rounded-lg bg-[url(/assets/sequoia.webp)] bg-center p-4"
      >
        {#key tab}
          <div
            in:fly={{ x: -766, duration: 500, opacity: 1 }}
            out:fly={{ x: 766, duration: 500, opacity: 1 }}
            class="showcase w-full !max-w-3xl border"
          >
            <tab.content />
          </div>
        {/key}
      </section>

      <section
        bind:this={contentNode}
        class="absolute top-full flex w-full -translate-y-4 justify-center"
      >
        <Tabs.List
          class={cn(
            'w-auto',
            contentInView.current ? 'animate-in' : 'animate-out',
            'fade-out fade-in slide-in-from-bottom-10 fill-mode-both duration-500 ease-in-out',
            'showcase tabs tabs-boxed rounded-full',
          )}
        >
          {#each tabs as tab}
            <Tabs.Trigger value={tab.id} class="rounded-full data-[state=active]:bg-blue-500"
              >{tab.label}</Tabs.Trigger
            >
          {/each}
        </Tabs.List>
      </section>
    </div>
  </Tabs.Root>
</article>
