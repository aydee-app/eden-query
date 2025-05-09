import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

import * as messages from '$lib/paraglide/messages'
import { paraglideMiddleware } from '$lib/paraglide/server'

const paraglideHandle: Handle = ({ event, resolve }) => {
  return paraglideMiddleware(event.request, ({ locale }) => {
    return resolve(event, {
      transformPageChunk: (input) => {
        const dir = messages.__direction(undefined, { locale })
        return input.html.replace('%lang%', locale).replace('%dir%', dir)
      },
    })
  })
}

export const handle: Handle = sequence(paraglideHandle)
