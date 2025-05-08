<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import CopyButton from '$lib/components/copy-button.svelte'
  import { cn } from '$lib/utils/cn'

  let { children, ...restProps }: HTMLAttributes<HTMLElement> = $props()

  let ref = $state<HTMLElement>()

  const dataProps = $derived(
    Object.fromEntries(Object.entries(restProps).filter((entry) => entry[0].startsWith('data-'))),
  )

  const dedupedQuotesTitle = $derived(restProps.title?.replace(/^"(.*)"$/, '$1'))
</script>

<!-- The code inside may be subject to special white-space rules when rendering code blocks. -->
<div
  class={cn(
    restProps.lang && `language-${restProps.lang}`,
    'not-prose',
    'vp-adaptive-theme vp-code',
    'group relative my-4 w-full overflow-x-auto',
    'bg-base-200 text-base-content rounded-box',
  )}
  {...dataProps}
>
  {#if dedupedQuotesTitle}
    <!-- @see https://github.com/yuyinws/vitepress-plugin-group-icons/blob/62c2cf203c6b4f001433089816b341403efefeba/src/codegen.ts#L8-L53 -->
    <!-- A .vp-code-block-title followed by data-title={name with icon} will have an icon applied. -->
    <div
      class="bg-base-300 vp-code-block-title flex items-center justify-between border-b p-2 pl-4"
    >
      <div>
        <span data-title={dedupedQuotesTitle}>{dedupedQuotesTitle}</span>
      </div>

      <div class="hover pointer-events-auto">
        <label class="btn btn-circle btn-xs swap">
          <input name="wrap" type="checkbox" />
          <span class="swap-on icon-[mdi--wrap]"></span>
          <span class="swap-off icon-[mdi--wrap-disabled]"></span>
        </label>
        <CopyButton {ref} class="btn-xs" />
      </div>
    </div>
  {/if}
  <div class="relative">
    <div class="peer overflow-x-auto py-4">
      <pre
        {...restProps}
        class={cn(restProps.class, 'group-has-[[name=wrap]:checked]:whitespace-pre-wrap')}
        bind:this={ref}>{@render children?.()}</pre>
    </div>

    {#if !dedupedQuotesTitle}
      <div
        class="peer/actions pointer-events-none absolute left-0 top-0 flex w-full justify-end p-2 opacity-0 transition-opacity hover:opacity-100 peer-hover:opacity-100"
      >
        <div class="hover pointer-events-auto">
          <label class="btn btn-circle swap">
            <input name="wrap" type="checkbox" />
            <span class="swap-on icon-[mdi--wrap]"></span>
            <span class="swap-off icon-[mdi--wrap-disabled]"></span>
          </label>
          <CopyButton {ref} />
        </div>
      </div>
      <div
        class="pointer-events-none absolute left-0 top-0 flex w-full justify-end px-2 transition-opacity hover:opacity-0 peer-hover/actions:opacity-0 peer-hover:opacity-0"
      >
        {#if restProps.lang}
          <span class={cn('text-xs')}>
            {restProps.lang}
          </span>
        {/if}
      </div>
    {/if}
  </div>
</div>
