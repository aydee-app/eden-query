<script lang="ts">
  import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
  import type { Snippet } from 'svelte'

  import { cn } from '$lib/utils/cn.js'

  import * as Dialog from '.'

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: DialogPrimitive.PortalProps
    children: Snippet
  } = $props()
</script>

<Dialog.Portal {...portalProps}>
  <Dialog.Overlay />

  <DialogPrimitive.Content
    bind:ref
    class={cn(
      'bg-base-100',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95',
      'data-[state=open]:zoom-in-95',
      // 'data-[state=closed]:slide-out-to-left-1/2',
      // 'data-[state=closed]:slide-out-to-top-[48%]',
      // 'data-[state=open]:slide-in-from-left-1/2',
      // 'data-[state=open]:slide-in-from-top-[48%]',
      'fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg',
      '-translate-x-1/2 -translate-y-1/2',
      'gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}

    <DialogPrimitive.Close
      class={cn(
        'btn btn-xs btn-square btn-ghost',
        'absolute top-2 right-2',
        // 'ring-offset-background focus:ring-ring',
        // 'data-[state=open]:bg-accent',
        // 'data-[state=open]:text-muted-foreground',
        // 'absolute top-4 right-4 rounded-sm',
        // 'opacity-70 transition-opacity hover:opacity-100',
        // 'focus:ring-2 focus:ring-offset-2 focus:outline-none',
        // 'disabled:pointer-events-none',
      )}
    >
      <span class="icon-[mdi--close] size-4"></span>
      <span class="sr-only">Close</span>
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
</Dialog.Portal>
