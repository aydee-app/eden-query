<script lang="ts">
  import type { GitHubAlert, GitHubAlertVariant } from 'mdast'
  import type { Snippet } from 'svelte'

  import * as Alert from '$lib/registry/new-york/ui/alert'
  import { cn } from '$lib/utils/cn'

  let props: GitHubAlert & { children?: Snippet } = $props()

  let { children, variant, title } = props

  const alertVariant: Record<GitHubAlertVariant, string> = {
    NOTE: '',
    TIP: 'alert-info',
    IMPORTANT: 'alert-success',
    WARNING: 'alert-warning',
    CAUTION: 'alert-error',
  }

  const alertIcon: Record<GitHubAlertVariant, string> = {
    NOTE: 'icon-[mdi--information]',
    TIP: 'icon-[mdi--lightbulb-outline]',
    IMPORTANT: 'icon-[mdi--alert-box-outline]',
    WARNING: 'icon-[mdi--warning-outline]',
    CAUTION: 'icon-[mdi--alert-octagon-outline]',
  }

  const variantClass = $derived(alertVariant[variant])

  const iconClass = $derived(alertIcon[variant])
</script>

<Alert.Root class={cn(variantClass, 'not-prose my-2')}>
  <Alert.Title class="flex items-center gap-2">
    {#if iconClass}
      <span class={cn(iconClass, 'size-5')}></span>
    {/if}
    <span>{title}</span>
  </Alert.Title>

  <Alert.Description>
    {@render children?.()}
  </Alert.Description>
</Alert.Root>
