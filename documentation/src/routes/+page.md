<script lang="ts">
  import Hero from './hero.svelte'
</script>

<div class="flex flex-col gap-16 text-gray-500/80 dark:text-gray-400/90 leading-normal text-lg">
  <Hero>
    <a href="#notes" class="p-4 text-center text-gray-400 group animate-in fade-in slide-in-from-top-2 duration-1000 ease-in-out">
      <span class="group-hover:underline">See why developers love Elysia</span>
      <span>&nbsp;&nbsp;</span>
      <span class="icon-[material-symbols--arrow-downward-rounded] h-6 w-6 align-bottom motion-safe:animate-bounce group-hover:duration-500"></span>
    </a>
  </Hero>
</div>
