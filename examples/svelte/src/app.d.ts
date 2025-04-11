// See https://kit.svelte.dev/docs/types#app

import type { DehydratedState, QueryClient } from '@tanstack/svelte-query'

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}

    interface Locals {
      queryClient: QueryClient
      dehydrated: DehydratedState
    }

    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}
