<script lang="ts" generics="Props, Result">
  import type { RenderOptions } from '@testing-library/svelte'

  type $$Props = RenderOptions & {
    initialProps: Props
    renderCallback: (initialProps: Props) => Result
  }

  let { initialProps, renderCallback }: $$Props = $props()

  export const result = renderCallback(initialProps)
</script>
