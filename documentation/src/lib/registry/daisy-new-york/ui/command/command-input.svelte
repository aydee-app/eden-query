<script lang="ts">
  import Search from '@lucide/svelte/icons/search'
  import { Command as CommandPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils/cn.js'

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(''),
    ...restProps
  }: CommandPrimitive.InputProps = $props()
</script>

<div class="flex items-center px-3" data-command-input-wrapper="">
  <Search class="mr-2 size-4 shrink-0 opacity-50" />

  <CommandPrimitive.Input
    class={cn(
      'placeholder:text-base-content/70',
      'text-base-content h-10 w-full rounded-md bg-transparent py-3 outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'md:text-sm',
      className,
    )}
    bind:ref
    bind:value
    {...restProps}
  />
</div>
