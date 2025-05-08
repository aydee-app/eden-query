<script lang="ts">
  import type { Tabs as MdastTabs } from 'mdast'
  import type { Snippet } from 'svelte'

  import * as Tabs from '$lib/registry/new-york/ui/tabs'

  let props: MdastTabs & { children?: Snippet } = $props()

  let value = $state(props.value)

  function handleChange(newValue: string) {
    if (typeof window === 'undefined' || !props.sync || !props.groupId) {
      value = newValue
      return
    }

    sessionStorage.setItem(props.groupId, newValue)

    const event = new StorageEvent('storage', { newValue })

    window.dispatchEvent(event)
  }

  $effect(() => {
    if (typeof window === 'undefined' || !props.sync || !props.groupId) return
    const storedValue = sessionStorage.getItem(props.groupId)

    if (storedValue) {
      value = storedValue
    }
  })

  $effect(() => {
    if (typeof window === 'undefined' || !props.sync || !props.groupId) return

    const listener = (
      ev: WindowEventMap['storage'],
      _options?: boolean | AddEventListenerOptions,
    ) => {
      if (ev.newValue) {
        value = ev.newValue
      }
    }

    window.addEventListener('storage', listener)

    return () => {
      window.removeEventListener('storage', listener)
    }
  })
</script>

<Tabs.Root bind:value onValueChange={handleChange} class="bg-base-200 w-full">
  {@render props.children?.()}
</Tabs.Root>
