<script lang="ts">
  import { Select as SelectPrimitive, type WithoutChild } from 'bits-ui'

  import { cn } from '$lib/utils/cn'

  let {
    ref = $bindable(null),
    class: className,
    value,
    label,
    children: childrenProp,
    noCheck,
    ...restProps
  }: WithoutChild<SelectPrimitive.ItemProps & { noCheck?: boolean }> = $props()
</script>

{#snippet child({ props, selected, highlighted }: any)}
  <li class="contents">
    <button {...props}>
      <span class="size-4">
        {#if selected && !noCheck}
          <span class="icon-[mdi--check] h-full w-full"></span>
        {/if}
      </span>

      {#if childrenProp}
        {@render childrenProp({ selected, highlighted })}
      {:else}
        {label || value}
      {/if}
    </button>
  </li>
{/snippet}

<SelectPrimitive.Item
  bind:ref
  {value}
  class={cn(
    'flex h-auto w-full justify-start border-none p-2 text-left font-normal',
    'btn btn-ghost data-[disabled]:btn-disabled data-[selected]:btn-active',
    className,
  )}
  {child}
  {...restProps}
/>
