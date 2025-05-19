<script lang="ts">
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils/cn'

  import Ray from './ray.svelte'

  interface $$Props {
    children?: Snippet
  }

  const { children }: $$Props = $props()

  const value = 'bun create elysia app'

  let copied = $state(false)

  let timeout = $state<ReturnType<typeof setTimeout>>()

  async function handleCopy(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (typeof navigator === 'undefined') return

    const text = value

    if (text == null) return

    e.preventDefault()
    e.stopPropagation()

    await navigator.clipboard.writeText(text)

    copied = true

    debouncedResetCopyCode()
  }

  function debouncedResetCopyCode() {
    clearTimeout(timeout)
    timeout = setTimeout(resetCopyCode, 1_000)
  }

  function resetCopyCode() {
    copied = false
  }
</script>

<div class="flex h-0 w-full grow flex-col gap-12">
  <Ray class="pointer-events-none -top-16 h-[60vh] opacity-[.35] dark:opacity-50" />

  <div class="flex w-full grow flex-col items-center justify-center gap-8 p-4">
    <div
      id="splash"
      class="gradient pointer-events-none absolute top-[-70vh] block h-screen w-full max-w-full justify-center opacity-25"
    ></div>

    <img
      src="/assets/elysia_v.webp"
      alt="Curved text logo saying 'Elysia JS'"
      class="aspect-3/2 w-full max-w-md object-contain"
    />

    <p>
      <span
        class="bg-gradient-to-r from-sky-300 to-violet-400 bg-clip-text text-5xl leading-tight font-bold text-transparent md:text-center md:text-6xl"
      >
        Ergonomic Framework for Humans
      </span>

      <span class="icon-[ph--sparkle-fill] h-10 w-10 align-top text-indigo-400"></span>
    </p>

    <h3
      class="w-full max-w-2xl text-xl !leading-normal text-gray-500 md:text-center md:text-2xl dark:text-gray-400"
    >
      <span>TypeScript with</span>
      <span
        class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text font-semibold text-transparent"
      >
        End-to-End Type Safety
      </span><span>,</span>
      <span>type integrity, and exceptional developer experience. Supercharged by Bun.</span>
    </h3>

    <section class="flex flex-wrap items-center gap-4 md:justify-center">
      <a class="btn btn-primary rounded-full px-6 text-lg" href="/eden-query/index">
        Get Started
      </a>

      <div class="flex items-center gap-4">
        <code
          class="bg-primary/25 rounded-full px-6 py-2.5 font-mono text-lg font-medium whitespace-nowrap"
        >
          {value}
        </code>

        <div
          class={cn('tooltip-bottom tooltip-primary', copied && 'tooltip tooltip-open')}
          data-tip="Copied"
        >
          <button
            class={cn('swap btn btn-primary btn-outline', copied && 'swap-active')}
            onclick={handleCopy}
            aria-label="Copy start script"
          >
            <span class="swap-on icon-[material-symbols--check-rounded] h-6 w-6"></span>
            <span class="swap-off icon-[material-symbols--content-copy-outline-rounded] h-6 w-6"
            ></span>
          </button>
        </div>
      </div>
    </section>
  </div>

  {@render children?.()}
</div>
