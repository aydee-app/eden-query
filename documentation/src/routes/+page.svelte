<script lang="ts">
  import Header from './header.svelte'
  import Hero from './hero.svelte'
  import Note from './note.svelte'
</script>

<main class="space-y-16 text-lg leading-normal text-gray-500/80 dark:text-gray-400/90">
  <div class="flex min-h-dvh flex-col">
    <Header />

    <Hero>
      <a
        href="#notes"
        class="animate-in fade-in slide-in-from-top-2 group p-4 text-center text-gray-400 duration-1000 ease-in-out"
      >
        <span class="group-hover:underline">See why developers love Elysia</span>
        <span>&nbsp;&nbsp;</span>
        <span
          class="icon-[material-symbols--arrow-downward-rounded] h-6 w-6 align-bottom group-hover:duration-500 motion-safe:animate-bounce"
        ></span>
      </a>
    </Hero>
  </div>

  <div id="notes">
    <Note />
  </div>
</main>
