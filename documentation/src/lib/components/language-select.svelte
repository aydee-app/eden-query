<script lang="ts">
  import { getLocale, getMessages } from '$lib/i18n'
  import { type Locale, locales } from '$lib/paraglide/runtime'
  import * as Select from '$lib/registry/new-york/ui/select'
  import { cn } from '$lib/utils/cn'

  let { locale = getLocale(), messages = getMessages(locale) } = $props()

  async function handleSelectedChange(selected?: string) {
    if (selected == null) return
    locale.set(selected as Locale, { reload: false })
  }
</script>

<!--
@component

A select menu that navigates to different language settings.
-->

<Select.Root type="single" value={$locale} onValueChange={handleSelectedChange}>
  <Select.Trigger class={cn(false && 'w-28')}>
    <!--
      <span class="hidden md:inline">
        {$messages.__name() || $messages.selectLanguage()}
      </span>
      -->

    <span class={cn('icon-[mdi--language]', false && 'inline md:hidden')}></span>
  </Select.Trigger>

  <Select.Content class="max-h-96" sideOffset={10}>
    <Select.ScrollUpButton />

    <Select.Group class="menu w-full p-0">
      {#each locales as locale}
        <Select.Item value={locale}>
          {$messages.__code({}, { locale })}
          {$messages.__name({}, { locale })}
        </Select.Item>
      {/each}
    </Select.Group>

    <Select.ScrollDownButton />
  </Select.Content>
</Select.Root>
