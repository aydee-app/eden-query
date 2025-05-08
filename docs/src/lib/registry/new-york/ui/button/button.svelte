<script lang="ts" module>
  import type { WithElementRef } from 'bits-ui'
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'
  import { tv, type VariantProps } from 'tailwind-variants'

  export const buttonVariants = tv({
    base: 'btn',
    variants: {
      variant: {
        default: '',
        destructive: 'btn-error',
        outline: 'btn-outline',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        link: 'btn-link',
      },
      size: {
        default: 'btn-md',
        sm: 'btn-sm',
        lg: 'btn-lg',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  })

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
  export type ButtonSize = VariantProps<typeof buttonVariants>['size']

  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> & {
      variant?: ButtonVariant
      size?: ButtonSize
    }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn'

  let {
    class: className,
    variant = 'default',
    size = 'default',
    ref = $bindable(null),
    href = undefined,
    type = 'button',
    children,
    ...restProps
  }: ButtonProps = $props()
</script>

{#if href}
  <a bind:this={ref} class={cn(buttonVariants({ variant, size }), className)} {href} {...restProps}>
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
