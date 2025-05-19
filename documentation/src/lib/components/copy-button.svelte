<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils/cn'

  type Props = HTMLAttributes<HTMLElement> & {
    value?: string
    ref?: HTMLElement
  }

  let { children, class: className, ref, value, ...restProps }: Props = $props()

  let copied = $state(false)

  let timeout = $state<ReturnType<typeof setTimeout>>()

  async function copyCode(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (typeof navigator === 'undefined') return

    const text = value || ref?.textContent

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

<button
  onclick={copyCode}
  class={cn(copied && 'swap-active', className, 'btn btn-soft btn-square swap')}
  aria-label="Copy"
  {...restProps}
>
  <span class="icon-[mdi--content-copy] swap-off"></span>
  <span class="icon-[mdi--success-bold] swap-on"></span>
</button>
