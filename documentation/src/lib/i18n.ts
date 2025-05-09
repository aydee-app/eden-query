import { getContext, setContext } from 'svelte'
import { derived, writable } from 'svelte/store'

import { goto } from '$app/navigation'
import { m } from '$lib/paraglide/messages'
import {
  getLocale as __getLocale,
  localizeUrl,
  setLocale as __setLocale,
} from '$lib/paraglide/runtime'

export function createObservableLocale() {
  const locale = writable(__getLocale())

  const originalSetLocale = locale.set

  const extendedSetLocale: typeof __setLocale = async (newLocale, ...args) => {
    __setLocale(newLocale, ...args)

    originalSetLocale(newLocale)

    if (args[0]?.reload !== false) return

    const newLocation = localizeUrl(window.location.href, {
      locale: newLocale,
    })

    goto(newLocation, { keepFocus: true, noScroll: true })

    if (typeof document === 'undefined') return

    document.documentElement.setAttribute('lang', newLocale)

    const dir = m.__direction(undefined, { locale: newLocale })

    document.documentElement.setAttribute('dir', dir)
  }

  return {
    ...locale,
    set: extendedSetLocale,
  }
}

export function createObservableMessages(locale = createObservableLocale()) {
  const messages = derived(locale, ($locale) => {
    const resolvedMessages = Object.fromEntries(
      Object.keys(m).map((key) => {
        const resolver = (...args: Parameters<(typeof m)[keyof typeof m]>) => {
          const resolvedArgs: typeof args = [...args]

          resolvedArgs[1] = { locale: $locale, ...args[1] }

          return m[key as keyof typeof m](...resolvedArgs)
        }

        return [key, resolver]
      }),
    )

    return resolvedMessages as typeof m
  })

  return messages
}

export const LOCALE_KEY = Symbol.for('i18n_paraglide_locale')

export const MESSAGES_KEY = Symbol.for('i18n_paraglide_messages')

export const setLocale = (locale = createObservableLocale()) => {
  setContext(LOCALE_KEY, locale)
  return locale
}

export const getLocale = () => {
  const locale: ReturnType<typeof createObservableLocale> =
    getContext(LOCALE_KEY) || createObservableLocale()
  return locale
}

export const setMessages = (locale = createObservableLocale()) => {
  const messages = createObservableMessages(locale)
  setContext(MESSAGES_KEY, messages)
  return messages
}

export const getMessages = (locale = createObservableLocale()) => {
  const messages: ReturnType<typeof createObservableMessages> =
    getContext(MESSAGES_KEY) || createObservableMessages(locale)
  return messages
}
